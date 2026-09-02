import type { CSSProperties, ReactNode } from 'react';
import { useCanvas } from '../../hooks/use-canvas';

export interface EnvDisplayProps {
  /** normalised contour: x 0..1 left->right, y 0..1 with 1 = peak */
  points: [number, number][];
  values: { label: string; text: string }[];
  color?: string;
}

/** LCD-style envelope screen plus a row of stage chips. Caller owns the data and
    recomputes it from live params; the draw is re-read every frame. */
export function EnvDisplay({ points, values, color }: EnvDisplayProps): ReactNode {
  const c = color ?? '#57e08a';
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#070b09';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,255,180,.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h * i) / 4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last || points.length < 2) return;
    const pad = 3;
    const X = (x: number): number => pad + x * (w - 2 * pad);
    const Y = (y: number): number => h - pad - y * (h - 2 * pad);

    ctx.beginPath();
    ctx.moveTo(X(first[0]), Y(0));
    for (const [x, y] of points) ctx.lineTo(X(x), Y(y));
    ctx.lineTo(X(last[0]), Y(0));
    ctx.closePath();
    ctx.fillStyle = c + '22';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(X(first[0]), Y(first[1]));
    for (const [x, y] of points) ctx.lineTo(X(x), Y(y));
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = c;
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;
  };
  const ref = useCanvas(draw, { height: 40 });
  return (
    <div className="env-screen" style={{ '--env-c': c } as CSSProperties}>
      <canvas ref={ref} />
      <div className="env-vals">
        {values.map((v) => (
          <div className="env-chip" key={v.label}>
            <span>{v.label}</span>
            <b>{v.text}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
