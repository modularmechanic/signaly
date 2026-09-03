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
import { disconnectCable } from '../../engine/rack';
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
  /** absent on the in-progress drag rope, which is not clickable */
  id?: number;
}

const SAG = 14;
const WIDTH = 3;
/** kind is legible without colour: the highlight pass carries a per-kind dash */
const DASH: Record<Kind, number[]> = { a: [], p: [10, 5], g: [3, 3], c: [1, 4] };
/** how close the pointer must come to a cable's centre line to grab it */
const HIT_PX = 7;
/** samples per curve for hit-testing: 24 keeps the error under a pixel at rack scale */
const HIT_STEPS = 24;
const INTERACTIVE = 'button, input, select, textarea, a, [role="slider"], [role="radio"], [contenteditable]';

const control = (s: Seg): Pt => ({
  x: (s.a.x + s.b.x) / 2,
  y: (s.a.y + s.b.y) / 2 + SAG + Math.hypot(s.b.x - s.a.x, s.b.y - s.a.y) * 0.16,
});

/** Squared distance from p to the quadratic through a -> control -> b, by sampling. */
function distToRope(s: Seg, p: Pt): number {
  const c = control(s);
  let best = Infinity;
  let px = s.a.x;
  let py = s.a.y;
  for (let i = 1; i <= HIT_STEPS; i++) {
    const t = i / HIT_STEPS;
    const u = 1 - t;
    const x = u * u * s.a.x + 2 * u * t * c.x + t * t * s.b.x;
    const y = u * u * s.a.y + 2 * u * t * c.y + t * t * s.b.y;
    // distance from p to the segment (px,py)-(x,y)
    const dx = x - px;
    const dy = y - py;
    const len = dx * dx + dy * dy;
    const h = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - px) * dx + (p.y - py) * dy) / len));
    const ex = px + h * dx - p.x;
    const ey = py + h * dy - p.y;
    best = Math.min(best, Math.hypot(ex, ey));
    px = x;
    py = y;
  }
  return best;
}

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

    const ptr = { x: -1, y: -1, inside: false };
    let dpr = 1;
    const size = (): void => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(window.innerWidth * dpr));
      cv.height = Math.max(1, Math.round(window.innerHeight * dpr));
      cv.style.width = window.innerWidth + 'px';
      cv.style.height = window.innerHeight + 'px';
    };
    size();

    let hover: number | null = null;
    /** Hit-testing is only ever wrong after the pointer or the cables move; idle frames skip it. */
    let moved = true;

    const rope = (s: Seg, lit: boolean): void => {
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
      if (lit) {
        ctx.strokeStyle = 'rgba(255,255,255,.85)';
        ctx.lineWidth = WIDTH + 4;
        curve(0);
      }
      ctx.strokeStyle = s.color;
      ctx.lineWidth = lit ? WIDTH + 1 : WIDTH;
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
        segs.push({ a, b, kind: out.kind, color: kindColor[out.kind], id: c.id });
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
      if (drag) hover = null;
      else if (moved) hover = hitTest(segs);
      moved = false;
      sig += `|h${hover ?? ''}`;
      if (sig === last) return;
      last = sig;
      document.body.classList.toggle('cable-hover', hover !== null);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (const s of segs) rope(s, s.id !== undefined && s.id === hover);
    };

    /** Nearest cable under the pointer, or null. The canvas never takes pointer events,
        so a cable lying over a knob or jack loses: the control stays clickable. */
    const hitTest = (segs: Seg[]): number | null => {
      if (!ptr.inside) return null;
      let best: number | null = null;
      let bestD = HIT_PX;
      for (const s of segs) {
        if (s.id === undefined) continue;
        const d = distToRope(s, ptr);
        if (d < bestD) {
          bestD = d;
          best = s.id;
        }
      }
      if (best === null) return null;
      const el = document.elementFromPoint(ptr.x, ptr.y);
      return el && el.closest(INTERACTIVE) ? null : best;
    };

    const onMove = (e: PointerEvent): void => {
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.inside = true;
      moved = true;
    };
    const onLeave = (): void => {
      ptr.inside = false;
      moved = true;
    };
    const onClick = (): void => {
      if (hover === null) return;
      disconnectCable(hover);
      hover = null;
      document.body.classList.remove('cable-hover');
    };

    const relayout = (): void => {
      invalidateJackRects();
      size();
      last = '';
      moved = true;
    };

    // A rack mutation only moves jacks; the canvas is viewport-sized and does not need resizing.
    const reflow = (): void => {
      invalidateJackRects();
      last = '';
      moved = true;
    };
    window.addEventListener('resize', relayout);
    window.addEventListener('scroll', reflow, true);
    // Removing or reordering a module reflows the row without a resize or scroll event, so the
    // cached jack rects would otherwise keep drawing every cable at its old position.
    const unsubRack = useRackStore.subscribe(reflow);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('click', onClick);
    const unregister = addDraw(draw);
    return () => {
      unregister();
      unsubRack();
      window.removeEventListener('resize', relayout);
      window.removeEventListener('scroll', reflow, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('click', onClick);
      document.body.classList.remove('cable-hover');
    };
  }, []);

  return <canvas className="cable-canvas" ref={ref} aria-hidden="true" />;
}
