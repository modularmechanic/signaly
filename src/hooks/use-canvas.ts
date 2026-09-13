import { useEffect, useRef, type RefObject } from 'react';
import { invalidateTokens } from './canvas-tokens';
import { addDraw } from './render-bus';

export interface UseCanvasOptions {
  /** Fixed CSS-pixel size. Omit either to size from the element's own box instead. */
  width?: number;
  height?: number;
  /** Size to the viewport rather than to any box — a fixed, full-screen overlay. */
  viewport?: boolean;
}

/** A `<canvas>` ref that stays DPR-sharp and repaints on the shared render bus.
    `draw` gets a context already scaled so 1 unit == 1 CSS pixel. */
export function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  opts: UseCanvasOptions = {},
): RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const { width, height, viewport } = opts;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = viewport ? window.innerWidth : (width ?? canvas.clientWidth);
    let h = viewport ? window.innerHeight : (height ?? canvas.clientHeight);

    const resize = (cssW: number, cssH: number): void => {
      w = cssW;
      h = cssH;
      // a DPR move or a reflow is the one signal we get that computed styles may have shifted
      invalidateTokens();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      if (viewport || width !== undefined) canvas.style.width = w + 'px';
      if (viewport || height !== undefined) canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize(w, h);

    const paint = (): void => {
      ctx.save();
      drawRef.current(ctx, w, h);
      ctx.restore();
    };
    paint(); // visible before the shared loop's first frame

    // A window dragged to a different-DPI display fires no resize on a fixed-size canvas.
    let mq: MediaQueryList | undefined;
    function onDpr(): void {
      resize(w, h);
      watchDpr();
    }
    function watchDpr(): void {
      mq?.removeEventListener('change', onDpr);
      mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mq.addEventListener('change', onDpr);
    }
    watchDpr();

    const onViewport = (): void => resize(window.innerWidth, window.innerHeight);
    if (viewport) window.addEventListener('resize', onViewport);

    let ro: ResizeObserver | undefined;
    if (!viewport && (width === undefined || height === undefined)) {
      ro = new ResizeObserver((entries) => {
        const box = entries[0]?.contentRect;
        if (box) resize(width ?? box.width, height ?? box.height);
      });
      ro.observe(canvas);
    }

    const unregister = addDraw(paint);
    return () => {
      unregister();
      ro?.disconnect();
      window.removeEventListener('resize', onViewport);
      mq?.removeEventListener('change', onDpr);
    };
  }, [width, height, viewport]);

  return ref;
}
