import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { Kind } from '../../core/types';
import { readTokens, type Tokens } from '../../hooks/canvas-tokens';
import { disconnectAt, getDrag } from '../../hooks/jack-interaction';
import { getJack, invalidateJackRects, jackCenter, jackKey, type JackDir } from '../../hooks/jack-registry';
import { useCanvas } from '../../hooks/use-canvas';
import { useRackStore } from '../../state/rack-store';
import { useSettingsStore } from '../../state/settings-store';
import { clickRemovesCable, jackSpace, overlayView, type Endpoint, type Pt, type Seg } from './cable-overlay';

// Cable metrics are quoted at 100% rack zoom and scaled by it: the panels behind them scale, so a
// plug drawn at a fixed 12px would swallow a zoomed-out socket and shrink to a speck zoomed in.
const WIDTH = 3;
const PLUG_R = 6;
const PIN_R = 2;
/** kind is legible without colour: the highlight pass carries a per-kind dash */
const DASH: Record<Kind, number[]> = { a: [], p: [10, 5], g: [3, 3], c: [1, 4] };
const INTERACTIVE = 'button, input, select, textarea, a, [role="slider"], [role="radio"], [contenteditable]';

function rope(ctx: CanvasRenderingContext2D, s: Seg, t: Tokens, lit: boolean, z: number): void {
  const color = t.kind[s.kind];
  const w = WIDTH * z;
  const curve = (dy: number): void => {
    ctx.beginPath();
    ctx.moveTo(s.a.x, s.a.y + dy);
    ctx.quadraticCurveTo(s.c.x, s.c.y + dy, s.b.x, s.b.y + dy);
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = w + 4 * z;
  curve(5 * z);
  ctx.strokeStyle = t.bg;
  ctx.lineWidth = w + 2 * z;
  curve(0);
  if (lit) {
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = w + 4 * z;
    curve(0);
  }
  // Seg.shade over the black jacket just laid down is a per-channel multiply, so the jacket
  // darkens without its hue moving — see the CVD note on SHADE_MIN in cable-overlay.ts.
  ctx.globalAlpha = (s.alpha ?? 1) * (s.shade ?? 1);
  ctx.strokeStyle = color;
  ctx.lineWidth = lit ? w + z : w;
  curve(0);
  ctx.globalAlpha = s.alpha ?? 1;
  ctx.strokeStyle = 'rgba(255,255,255,.22)';
  ctx.lineWidth = Math.max(0.5, z);
  ctx.setLineDash(DASH[s.kind].map((d) => d * z));
  curve(-0.5 * z);
  ctx.setLineDash([]);
  for (const p of [s.a, s.b]) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLUG_R * z, 0, Math.PI * 2);
    ctx.fillStyle = t.metal2;
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 * z;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(p.x, p.y, PIN_R * z, 0, Math.PI * 2);
    ctx.fillStyle = t.edge;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

const blockedAt = (x: number, y: number): boolean => {
  const el = document.elementFromPoint(x, y);
  return !!el?.closest(INTERACTIVE);
};

/** One canvas for every cable. Never re-renders: geometry is rebuilt inside the shared
    render-bus draw, and an unchanged signature skips the repaint. */
export function CableCanvas({ rack }: { rack: RefObject<HTMLElement | null> }): ReactNode {
  const ptr = useRef({ x: -1, y: -1, inside: false });
  /** The press in progress: where it started, whether it started on a control, still down. */
  const press = useRef({ x: 0, y: 0, onControl: false, down: false });
  const hover = useRef<number | null>(null);
  /** Anything that could change what lies under the pointer since the last frame. */
  const moved = useRef(true);
  const last = useRef('');

  const ref = useCanvas(
    (ctx, w, h) => {
      const zoom = useSettingsStore.getState().zoom;
      const el = rack.current;
      const sp = el ? jackSpace(el.getBoundingClientRect(), el.offsetWidth, zoom) : null;
      const map = (p: Pt): Pt =>
        sp ? { x: sp.ox + (p.x - sp.ox) * sp.k, y: sp.oy + (p.y - sp.oy) * sp.k } : p;
      const lookup = (uid: number, dir: JackDir, jackId: string): Endpoint | undefined => {
        const info = getJack(jackKey(uid, dir, jackId));
        return info && { at: map(jackCenter(info)), kind: info.def.kind };
      };
      const view = overlayView({
        cables: useRackStore.getState().cables,
        lookup,
        drag: getDrag(),
        pointer: ptr.current,
        blockedAt,
        controlHeld: press.current.down && press.current.onControl,
        moved: moved.current,
        prevHover: hover.current,
        zoom,
        w,
        h,
      });
      hover.current = view.hover;
      moved.current = false;
      if (view.sig === last.current) return;
      last.current = view.sig;
      document.body.classList.toggle('cable-hover', view.hover !== null);
      ctx.clearRect(0, 0, w, h);
      const t = readTokens();
      for (const s of view.segs) rope(ctx, s, t, s.id !== undefined && s.id === view.hover, zoom);
    },
    { viewport: true },
  );

  useEffect(() => {
    /** Set at pointerup; the click that follows may remove a cable only if this survives. */
    let armed = false;
    const onMove = (e: PointerEvent): void => {
      ptr.current.x = e.clientX;
      ptr.current.y = e.clientY;
      ptr.current.inside = true;
      moved.current = true;
    };
    const onLeave = (): void => {
      ptr.current.inside = false;
      moved.current = true;
    };
    const onDown = (e: PointerEvent): void => {
      // A press that was cancelled, or that never produced a click, must not arm this one.
      armed = false;
      press.current = {
        x: e.clientX,
        y: e.clientY,
        down: true,
        onControl: e.target instanceof Element && e.target.closest(INTERACTIVE) !== null,
      };
      moved.current = true;
    };
    const onUp = (e: PointerEvent): void => {
      const p = press.current;
      p.down = false;
      armed = clickRemovesCable({
        onControl: p.onControl,
        travel: Math.hypot(e.clientX - p.x, e.clientY - p.y),
      });
      moved.current = true;
    };
    // A cancelled press produces no click, so it must leave nothing armed behind it.
    const onCancel = (): void => {
      press.current.down = false;
      armed = false;
      moved.current = true;
    };
    const onClick = (): void => {
      const remove = armed;
      // One press, one chance: a click with no press behind it (a keyboard Enter, say) must
      // never fall through to whatever cable the cursor was last resting on.
      armed = false;
      if (!remove || hover.current === null) return;
      disconnectAt(hover.current);
      hover.current = null;
      document.body.classList.remove('cable-hover');
    };
    // Cached jack centres go stale on scroll, on resize, on a zoom, and on any rack mutation —
    // removing or reordering a module reflows the row without firing either event.
    // Each of these can slide a cable under a pointer that has not moved, so each must re-arm the
    // hit test as well as drop the cached rects — or a click removes whatever used to be there.
    const stale = (): void => {
      invalidateJackRects();
      moved.current = true;
    };
    const unsubRack = useRackStore.subscribe(stale);
    const unsubZoom = useSettingsStore.subscribe((s, prev) => {
      if (s.zoom !== prev.zoom) stale();
    });
    window.addEventListener('resize', stale);
    window.addEventListener('scroll', stale, true);
    // Pinching the page itself moves painted content under a fixed canvas.
    window.visualViewport?.addEventListener('resize', stale);
    window.visualViewport?.addEventListener('scroll', stale);
    // Capture phase: a control's own handler calls stopPropagation, and pointer capture
    // retargets the event to it, so the bubble phase never reliably reaches the window.
    window.addEventListener('pointerdown', onDown, { capture: true, passive: true });
    window.addEventListener('pointerup', onUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', onCancel, { capture: true, passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerleave', onLeave, { passive: true });
    window.addEventListener('click', onClick);
    return () => {
      unsubRack();
      unsubZoom();
      window.removeEventListener('resize', stale);
      window.removeEventListener('scroll', stale, true);
      window.visualViewport?.removeEventListener('resize', stale);
      window.visualViewport?.removeEventListener('scroll', stale);
      window.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointerup', onUp, { capture: true });
      window.removeEventListener('pointercancel', onCancel, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('click', onClick);
      document.body.classList.remove('cable-hover');
    };
  }, []);

  return <canvas className="cable-canvas" ref={ref} aria-hidden="true" />;
}
