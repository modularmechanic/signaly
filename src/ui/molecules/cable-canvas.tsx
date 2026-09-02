import { useEffect, useRef, type ReactNode } from 'react';
import type { Kind } from '../../core/types';
import { addDraw } from '../../hooks/render-bus';
import {
  getDrag,
  getJack,
  invalidateJackRects,
  jackCenter,
  jackKey,
  type JackInfo,
} from '../../hooks/patch-state';
import { useRackStore } from '../../state/rack-store';

interface Pt {
  x: number;
  y: number;
}
interface Seg {
  a: Pt;
  b: Pt;
  kind: Kind;
  color: string;
  alpha?: number;
}

const SAG = 14;
const WIDTH = 3;
/** kind is legible without colour: the highlight pass carries a per-kind dash */
const DASH: Record<Kind, number[]> = { a: [], p: [10, 5], g: [3, 3], c: [1, 4] };

/** One canvas for every cable. Never re-renders: endpoints and cables are read
    inside the shared render-bus draw, and an unchanged signature skips the repaint. */
export function CableCanvas(): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;

    const css = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string): string => css.getPropertyValue(name).trim() || fallback;
    const kindColor: Record<Kind, string> = {
      a: read('--kind-a', '#ffb02e'),
      p: read('--kind-p', '#5ab4ff'),
      g: read('--kind-g', '#ff5fa0'),
      c: read('--kind-c', '#68f3bf'),
    };
    const jacket = read('--bg', '#0a0a0b');
    const plug = read('--metal-2', '#0f1012');
    const pin = read('--edge', '#050506');

    let dpr = 1;
    const size = (): void => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(window.innerWidth * dpr));
      cv.height = Math.max(1, Math.round(window.innerHeight * dpr));
      cv.style.width = window.innerWidth + 'px';
      cv.style.height = window.innerHeight + 'px';
    };
    size();

    const rope = (s: Seg): void => {
      const mx = (s.a.x + s.b.x) / 2;
      const my = (s.a.y + s.b.y) / 2 + SAG + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 0.16;
      const curve = (dy: number): void => {
        ctx.beginPath();
        ctx.moveTo(s.a.x, s.a.y + dy);
        ctx.quadraticCurveTo(mx, my + dy, s.b.x, s.b.y + dy);
        ctx.stroke();
      };
      ctx.lineCap = 'round';
      ctx.globalAlpha = s.alpha ?? 1;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.lineWidth = WIDTH + 4;
      curve(5);
      ctx.strokeStyle = jacket;
      ctx.lineWidth = WIDTH + 2;
      curve(0);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = WIDTH;
      curve(0);
      ctx.strokeStyle = 'rgba(255,255,255,.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash(DASH[s.kind]);
      curve(-0.5);
      ctx.setLineDash([]);
      for (const p of [s.a, s.b]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = plug;
        ctx.fill();
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = pin;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    let last = '';
    const draw = (): void => {
      const segs: Seg[] = [];
      let sig = `${cv.width}x${cv.height}`;
      for (const c of useRackStore.getState().cables) {
        const out = getJack(jackKey(c.from.uid, 'out', c.from.jack));
        const inp = getJack(jackKey(c.to.uid, 'in', c.to.jack));
        if (!out || !inp) continue;
        const a = jackCenter(out);
        const b = jackCenter(inp);
        segs.push({ a, b, kind: out.kind, color: kindColor[out.kind] });
        sig += `|${c.id},${a.x | 0},${a.y | 0},${b.x | 0},${b.y | 0}`;
      }
      const drag = getDrag();
      if (drag) {
        const fixed: JackInfo = drag.fixed;
        const at = jackCenter(fixed);
        const mouse = { x: drag.x, y: drag.y };
        segs.push({
          a: fixed.dir === 'out' ? at : mouse,
          b: fixed.dir === 'out' ? mouse : at,
          kind: drag.kind,
          color: kindColor[drag.kind],
          alpha: 0.85,
        });
        sig += `|d${drag.x | 0},${drag.y | 0},${drag.kind}`;
      }
      if (sig === last) return;
      last = sig;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of segs) rope(s);
    };

    const relayout = (): void => {
      invalidateJackRects();
      size();
      last = '';
    };
    window.addEventListener('resize', relayout);
    window.addEventListener('scroll', invalidateJackRects, true);
    const unregister = addDraw(draw);
    return () => {
      unregister();
      window.removeEventListener('resize', relayout);
      window.removeEventListener('scroll', invalidateJackRects, true);
    };
  }, []);

  return <canvas className="cable-canvas" ref={ref} aria-hidden="true" />;
}
