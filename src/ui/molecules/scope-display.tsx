import { useMemo, type ReactNode } from 'react';
import { readTokens } from '../../hooks/canvas-tokens';
import { useCanvas } from '../../hooks/use-canvas';

export interface ScopeDisplayProps {
  analyser?: AnalyserNode;
}

/** Oscilloscope trace on the shared render bus. Buffer is allocated once per analyser.
    The trace colour is the module's own `--cat`, read off the screen element. */
export function ScopeDisplay({ analyser }: ScopeDisplayProps): ReactNode {
  const buf = useMemo(() => new Float32Array(analyser ? analyser.fftSize : 1), [analyser]);

  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    ctx.clearRect(0, 0, w, h);
    if (!analyser) return;
    analyser.getFloatTimeDomainData(buf);
    const c = readTokens(ctx.canvas).cat;
    const mid = h / 2;
    const amp = mid - 1;
    ctx.beginPath();
    for (let i = 0; i < buf.length; i++) {
      const v = Math.max(-1, Math.min(1, (buf[i] ?? 0) / 5));
      const x = (i / (buf.length - 1 || 1)) * w;
      const y = mid - v * amp;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = c;
    ctx.shadowBlur = 4;
    ctx.stroke();
  };

  const ref = useCanvas(draw);
  return (
    <div className="scope-screen" style={{ height: '100%' }}>
      <canvas ref={ref} />
    </div>
  );
}
