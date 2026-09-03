import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import type { KnobDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { fmtValue } from '../../hooks/formatters';
import { useParam } from '../../hooks/module-api';
import { clamp, knobNorm, knobQuantize, knobValue, sliderKey } from './knob';

export interface FaderProps {
  m: ModuleInstance;
  def: KnobDef;
}

export function Fader({ m, def }: FaderProps): ReactNode {
  const [val, setVal] = useParam(m, def.id);
  const track = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const n = knobNorm(def, val);

  const fromY = (clientY: number): void => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.height <= 0) return;
    setVal(knobQuantize(def, knobValue(def, clamp(1 - (clientY - r.top) / r.height, 0, 1))));
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = true;
    fromY(e.clientY);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>): void => {
    if (dragging.current) fromY(e.clientY);
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>): void => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const next = sliderKey(def, val, e);
    if (next === undefined) return;
    e.preventDefault();
    setVal(knobQuantize(def, next));
  };

  return (
    <div className="fader-cell" data-param-id={def.id}>
      <div
        ref={track}
        className="fader"
        role="slider"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={def.label}
        aria-valuemin={def.min}
        aria-valuemax={def.max}
        aria-valuenow={val}
        aria-valuetext={fmtValue(def.fmt, val)}
        style={{ '--pct': n } as CSSProperties}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={() => setVal(def.initial)}
      >
        <div className="fader-cap" />
      </div>
      <div className="knob-label">{def.label}</div>
    </div>
  );
}
