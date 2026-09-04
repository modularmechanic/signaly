import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useSettingsStore } from '../state/settings-store';
import { invalidateJackRects } from './patch-state';

/** One press of + or −. 1.25 is four steps per octave of scale: coarse enough to get somewhere
    on a phone, fine enough to land on a comfortable size. */
export const ZOOM_STEP = 1.25;

export interface RackZoom {
  zoom: number;
  /** Multiply the zoom, holding the content under `anchorY` (screen px) still. */
  zoomBy(factor: number, anchorY?: number): void;
  reset(): void;
}

/** CSS `zoom` on the rack surface, driven from a CSS variable so a zoom change never re-renders
    a single module panel. `zoom` (unlike a transform) scales the layout box, so the row scrollers
    keep working, `getBoundingClientRect` keeps returning screen coordinates — which is what the
    cable overlay measures — and the panels' container queries still see their own unscaled width,
    so the art scales instead of reflowing. */
/** Where the content under the anchor sat, captured before a change and spent after layout. */
type Anchor = { content: number; y: number } | null;

/** Set the zoom, recording what the anchor was pointing at so the layout effect can hold it
    still. A plain function, not a memoized closure over `rack.current`: reading a ref inside
    `useCallback` is exactly the manual memoization the React Compiler cannot preserve. */
function zoomTo(el: HTMLElement | null, anchor: { current: Anchor }, next: number, anchorY?: number): void {
  const from = useSettingsStore.getState().zoom;
  if (el) {
    const y = anchorY ?? window.innerHeight / 2;
    anchor.current = { content: (y - el.getBoundingClientRect().top) / from, y };
  }
  useSettingsStore.getState().setZoom(next);
}

export function useRackZoom(rack: RefObject<HTMLElement | null>): RackZoom {
  const zoom = useSettingsStore((s) => s.zoom);
  const anchor = useRef<Anchor>(null);

  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--rack-zoom', String(zoom));
    // Every jack moved; the cable overlay caches their centres until told otherwise.
    invalidateJackRects();
    const a = anchor.current;
    anchor.current = null;
    const el = rack.current;
    if (!a || !el) return;
    // The rack's offset in the document is set by the chrome above it, which never zooms, so
    // holding a point still is purely a page-scroll correction.
    const docTop = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.max(0, docTop + a.content * zoom - a.y) });
  }, [zoom, rack]);

  useEffect(() => {
    const el = rack.current;
    if (!el) return;

    // Two-finger pinch. `.rack-scroll` sets `touch-action: pan-x pan-y`, which leaves one-finger
    // scrolling to the browser and hands the pinch to us instead of to the browser's page zoom.
    const pts = new Map<number, { x: number; y: number }>();
    let start: { gap: number; zoom: number } | null = null;
    const two = (): [{ x: number; y: number }, { x: number; y: number }] | null => {
      if (pts.size !== 2) return null;
      const [a, b] = [...pts.values()];
      return a && b ? [a, b] : null;
    };

    const down = (e: PointerEvent): void => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = two();
      if (p)
        start = { gap: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y), zoom: useSettingsStore.getState().zoom };
    };
    const move = (e: PointerEvent): void => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const p = two();
      if (!p || !start || start.gap < 1) return;
      e.preventDefault();
      const gap = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
      zoomTo(el, anchor, (start.zoom * gap) / start.gap, (p[0].y + p[1].y) / 2);
    };
    const up = (e: PointerEvent): void => {
      pts.delete(e.pointerId);
      if (pts.size < 2) start = null;
    };

    // A trackpad pinch arrives as a ctrl-wheel; so does the desktop ctrl/⌘ + scroll convention.
    const wheel = (e: WheelEvent): void => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      zoomTo(el, anchor, useSettingsStore.getState().zoom * Math.exp(-e.deltaY * 0.01), e.clientY);
    };

    el.addEventListener('pointerdown', down, { passive: true });
    el.addEventListener('pointermove', move, { passive: false });
    el.addEventListener('pointerup', up, { passive: true });
    el.addEventListener('pointercancel', up, { passive: true });
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [rack]);

  return {
    zoom,
    zoomBy: (factor, anchorY) =>
      zoomTo(rack.current, anchor, useSettingsStore.getState().zoom * factor, anchorY),
    reset: () => zoomTo(rack.current, anchor, 1),
  };
}
