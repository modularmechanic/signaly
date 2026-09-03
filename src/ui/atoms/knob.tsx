import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { KnobDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { fmtValue, isIntFmt } from '../../hooks/formatters';
import { useCvMod, useParam } from '../../hooks/module-api';

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);

const isLog = (d: KnobDef): boolean => d.curve === 'log' && d.min > 0 && d.max > 0;

/** value -> 0..1 travel */
export const knobNorm = (d: KnobDef, v: number): number =>
  clamp(isLog(d) ? Math.log(v / d.min) / Math.log(d.max / d.min) : (v - d.min) / (d.max - d.min), 0, 1);

/** 0..1 travel -> value */
export const knobValue = (d: KnobDef, n: number): number =>
  isLog(d) ? d.min * (d.max / d.min) ** n : d.min + (d.max - d.min) * n;

export const knobQuantize = (d: KnobDef, v: number): number =>
  clamp(isIntFmt(d.fmt) ? Math.round(v) : v, d.min, d.max);

/** ARIA slider key set, in value space. `undefined` = not one of ours. */
export function sliderKey(d: KnobDef, v: number, e: KeyboardEvent): number | undefined {
  const range = d.max - d.min;
  const int = isIntFmt(d.fmt);
  const step = int ? 1 : e.shiftKey ? range / 1000 : range / 100;
  const large = int ? Math.max(1, Math.round(range / 10)) : range / 10;
  switch (e.key) {
    case 'ArrowUp':
    case 'ArrowRight':
      return v + step;
    case 'ArrowDown':
    case 'ArrowLeft':
      return v - step;
    case 'PageUp':
      return v + large;
    case 'PageDown':
      return v - large;
    case 'Home':
      return d.min;
    case 'End':
      return d.max;
    default:
      return undefined;
  }
}

export interface KnobProps {
  m: ModuleInstance;
  def: KnobDef;
  /** signed modulation depth in 0..1 travel space — the marker's resting place while the
      knob's `cvIn` jack is unpatched. Patched, `useCvMod` animates the marker instead. */
  cv?: number;
}

export function Knob({ m, def, cv }: KnobProps): ReactNode {
  const [val, setVal] = useParam(m, def.id);
  const drag = useRef<{ n: number; x: number; y: number; ax?: 'x' | 'y' } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const n = knobNorm(def, val);
  const live = useCvMod(m, def.cvIn, ref, n);
  const commit = (v: number): void => setVal(knobQuantize(def, v));

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { n, x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    // Latched past a slop radius, else a diagonal drag flips mapping every move.
    if (d.ax === undefined) {
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      d.ax = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    const delta = d.ax === 'x' ? -dx : dy;
    commit(knobValue(def, clamp(d.n - delta * 0.006 * (e.shiftKey ? 0.15 : 1), 0, 1)));
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const next = sliderKey(def, val, e);
    if (next === undefined) return;
    e.preventDefault();
    commit(next);
  };

  const marker = live || (cv !== undefined && cv !== 0);
  // While live the render bus owns --cv; leaving it out of the style object is what stops
  // React from stomping the animated value on every re-render.
  const style = {
    '--pct': n,
    ...(live ? null : { '--cv': cv !== undefined && cv !== 0 ? clamp(n + cv, 0, 1) : n }),
  } as CSSProperties;

  return (
    <div className={'knob-cell' + (def.big ? ' big' : '')} data-param-id={def.id}>
      <div
        ref={ref}
        className="knob"
        role="slider"
        tabIndex={0}
        aria-label={def.label}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={val}
        aria-valuetext={fmtValue(def.fmt, val)}
        style={style}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => commit(def.initial)}
      >
        <div className="knob-cap" style={{ transform: `rotate(${(-135 + n * 270).toFixed(2)}deg)` }} />
        {marker && <i className="knob-cv" aria-hidden="true" />}
      </div>
      <div className="knob-label">{def.label}</div>
    </div>
  );
}
