import type { CSSProperties, ReactNode } from 'react';
import { readTokens } from '../../hooks/canvas-tokens';
import { useCanvas } from '../../hooks/use-canvas';

export interface EnvDisplayProps {
  /** normalised contour: x 0..1 left->right, y 0..1 with 1 = peak */
  points: [number, number][];
  values: { label: string; text: string }[];
}

/** LCD-style envelope screen plus a row of stage chips. Caller owns the data and
    recomputes it from live params; the draw is re-read every frame. The contour colour is
    the module's own `--cat`, read off the screen element. */
export function EnvDisplay({ points, values }: EnvDisplayProps): ReactNode {
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    const t = readTokens(ctx.canvas);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = t.screen;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = t.borderSoft;
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
    const c = t.cat;
    const pad = 3;
    const X = (x: number): number => pad + x * (w - 2 * pad);
    const Y = (y: number): number => h - pad - y * (h - 2 * pad);

    ctx.beginPath();
    ctx.moveTo(X(first[0]), Y(0));
    for (const [x, y] of points) ctx.lineTo(X(x), Y(y));
    ctx.lineTo(X(last[0]), Y(0));
    ctx.closePath();
    // alpha, not a hex suffix — the token need not be six-digit hex
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = c;
    ctx.fill();
    ctx.globalAlpha = 1;

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
  const ref = useCanvas(draw);
  const style = { '--env-c': 'var(--cat)', height: '100%', display: 'flex', flexDirection: 'column' };
  return (
    <div className="env-screen" style={style as CSSProperties}>
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
