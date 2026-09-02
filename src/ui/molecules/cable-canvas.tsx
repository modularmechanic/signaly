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
  color: string;
}

const SAG = 10;
const WIDTH = 4;

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
      a: read('--kind-a', '#e8871e'),
      p: read('--kind-p', '#3b82f6'),
      g: read('--kind-g', '#d6336c'),
      c: read('--kind-c', '#2dc7c0'),
    };
    const shade = read('--bg', '#101114');
    const sheen = read('--border-soft', 'rgba(255,255,255,.28)');

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
      const my = (s.a.y + s.b.y) / 2 + SAG + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 0.18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s.a.x, s.a.y + 3);
      ctx.quadraticCurveTo(mx, my + 3, s.b.x, s.b.y + 3);
      ctx.strokeStyle = shade;
      ctx.lineWidth = WIDTH + 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s.a.x, s.a.y);
      ctx.quadraticCurveTo(mx, my, s.b.x, s.b.y);
      ctx.strokeStyle = s.color;
      ctx.lineWidth = WIDTH;
      ctx.stroke();
      ctx.strokeStyle = sheen;
      ctx.lineWidth = 1;
      ctx.stroke();
      for (const p of [s.a, s.b]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, WIDTH, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
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
        segs.push({ a, b, color: kindColor[out.kind] });
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
          color: kindColor[drag.kind],
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
