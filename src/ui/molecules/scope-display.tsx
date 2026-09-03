import { useMemo, type CSSProperties, type ReactNode } from 'react';
import { useCanvas } from '../../hooks/use-canvas';

export interface ScopeDisplayProps {
  analyser?: AnalyserNode;
  color?: string;
}

/** Oscilloscope trace on the shared render bus. Buffer is allocated once per analyser. */
export function ScopeDisplay({ analyser, color }: ScopeDisplayProps): ReactNode {
  const c = color ?? '#57e08a';
  const buf = useMemo(() => new Float32Array(analyser ? analyser.fftSize : 1), [analyser]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    ctx.clearRect(0, 0, w, h);
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    const mid = h / 2;
    const amp = mid - 1;
    const span = buf.length - 1 || 1;
    // One column per CSS pixel: at fftSize 2048 across ~100 px the rest are sub-pixel. Emitting
    // the bucket's min and max keeps a single-sample transient as tall as it really is.
    const step = Math.max(1, Math.floor(buf.length / w));
    ctx.beginPath();
    for (let i = 0; i < buf.length; i += step) {
      const end = Math.min(i + step, buf.length);
      let lo = Infinity;
      let hi = -Infinity;
      for (let j = i; j < end; j++) {
        const v = buf[j] ?? 0;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
      const x = (i / span) * w;
      const yHi = mid - Math.max(-1, Math.min(1, hi / 5)) * amp;
      const yLo = mid - Math.max(-1, Math.min(1, lo / 5)) * amp;
      if (i === 0) ctx.moveTo(x, yHi);
      else ctx.lineTo(x, yHi);
      ctx.lineTo(x, yLo);
    }
    // A wide low-alpha under-stroke stands in for shadowBlur, which composites the whole path
    // through an offscreen buffer every frame.
    ctx.strokeStyle = c;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  };

  const ref = useCanvas(draw, { height: 46 });
  return (
    <div className="scope-screen" style={{ '--scope-c': c } as CSSProperties}>
      <canvas ref={ref} />
    </div>
  );
}
