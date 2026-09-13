import { useEffect, useRef, type ReactNode } from 'react';
import type { Kind } from '../../core/types';
import { readTokens, type Tokens } from '../../hooks/canvas-tokens';
import { disconnectAt, getDrag } from '../../hooks/jack-interaction';
import { getJack, invalidateJackRects, jackCenter, jackKey, type JackDir } from '../../hooks/jack-registry';
import { useCanvas } from '../../hooks/use-canvas';
import { useRackStore } from '../../state/rack-store';
import { overlayView, type Endpoint, type Seg } from './cable-overlay';

const WIDTH = 3;
/** kind is legible without colour: the highlight pass carries a per-kind dash */
const DASH: Record<Kind, number[]> = { a: [], p: [10, 5], g: [3, 3], c: [1, 4] };
const INTERACTIVE = 'button, input, select, textarea, a, [role="slider"], [role="radio"], [contenteditable]';

function rope(ctx: CanvasRenderingContext2D, s: Seg, t: Tokens, lit: boolean): void {
  const color = t.kind[s.kind];
  const curve = (dy: number): void => {
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y + dy);
    ctx.quadraticCurveTo(s.c.x, s.c.y + dy, s.b.x, s.b.y + dy);
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = WIDTH + 4;
  curve(5);
  ctx.strokeStyle = t.bg;
  ctx.lineWidth = WIDTH + 2;
  curve(0);
  if (lit) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = WIDTH + 4;
    curve(0);
  }
  // Seg.shade over the black jacket just laid down is a per-channel multiply, so the jacket
  // darkens without its hue moving — see the CVD note on SHADE_MIN in cable-overlay.ts.
  ctx.globalAlpha = (s.alpha ?? 1) * (s.shade ?? 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lit ? WIDTH + 1 : WIDTH;
  curve(0);
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = 1;
  ctx.setLineDash(DASH[s.kind]);
  curve(-0.5);
  ctx.setLineDash([]);
  for (const p of [s.a, s.b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = t.metal2;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fillStyle = t.edge;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const lookup = (uid: number, dir: JackDir, jackId: string): Endpoint | undefined => {
  const info = getJack(jackKey(uid, dir, jackId));
  return info && { at: jackCenter(info), kind: info.def.kind };
};

const blockedAt = (x: number, y: number): boolean => {
  const el = document.elementFromPoint(x, y);
  return !!el?.closest(INTERACTIVE);
};

/** One canvas for every cable. Never re-renders: geometry is rebuilt inside the shared
    render-bus draw, and an unchanged signature skips the repaint. */
export function CableCanvas(): ReactNode {
  const ptr = useRef({ x: -1, y: -1, inside: false });
  const hover = useRef<number | null>(null);
  const last = useRef('');

  const ref = useCanvas(
    (ctx, w, h) => {
      const view = overlayView({
        cables: useRackStore.getState().cables,
        lookup,
        drag: getDrag(),
        pointer: ptr.current,
        blockedAt,
        w,
        h,
      });
      hover.current = view.hover;
      if (view.sig === last.current) return;
      last.current = view.sig;
      document.body.classList.toggle('cable-hover', view.hover !== null);
      ctx.clearRect(0, 0, w, h);
      const t = readTokens();
      for (const s of view.segs) rope(ctx, s, t, s.id !== undefined && s.id === view.hover);
    },
    { viewport: true },
  );

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      ptr.current.x = e.clientX;
      ptr.current.y = e.clientY;
      ptr.current.inside = true;
    };
    const onLeave = (): void => {
      ptr.current.inside = false;
    };
    const onClick = (): void => {
      if (hover.current === null) return;
      disconnectAt(hover.current);
      hover.current = null;
      document.body.classList.remove('cable-hover');
    };
    // Cached jack centres go stale on scroll, on resize, and on any rack mutation — removing or
    // reordering a module reflows the row without firing either event.
    const unsubRack = useRackStore.subscribe(invalidateJackRects);
    window.addEventListener('resize', invalidateJackRects);
    window.addEventListener('scroll', invalidateJackRects, true);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      unsubRack();
      window.removeEventListener('resize', invalidateJackRects);
      window.removeEventListener('scroll', invalidateJackRects, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('click', onClick);
      document.body.classList.remove('cable-hover');
    };
  }, []);

  return <canvas className="cable-canvas" ref={ref} aria-hidden="true" />;
}
