import type { CSSProperties, FC } from 'react';

export interface LedProps {
  /** boolean, or 0..1 intensity for VU-style fades driven by useRenderFrame */
  on: boolean | number;
  color?: string;
  label?: string;
}

export const Led: FC<LedProps> = ({ on, color, label }) => {
  const intensity = typeof on === 'number' ? on : on ? 1 : 0;
  const style = {
    '--led-c': color ?? 'var(--cat, var(--led))',
    opacity: 0.15 + intensity * 0.85,
  } as CSSProperties;
  return (
    <div className="led-cell">
      <div className="led" style={style} />
      {label !== undefined && <div className="led-label">{label}</div>}
    </div>
  );
};
