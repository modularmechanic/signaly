import type { KeyboardEvent, ReactNode } from 'react';
import type { SwitchDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { useSwitch } from '../../hooks/module-api';
import { Select } from './select';

export interface SwitchProps {
  m: ModuleInstance;
  def: SwitchDef;
}

/** One option is a lit push-button toggle (0/1), 2–4 a radiogroup, a native select beyond that. */
export function Switch({ m, def }: SwitchProps): ReactNode {
  const [i, setI] = useSwitch(m, def.id);
  const count = def.options.length;
  const current = def.options[i] ?? def.options[0] ?? '';

  if (count === 1) {
    // The M and S of a console strip: the legend IS the button, and the label is only its name.
    const on = i >= 1;
    return (
      <div className="switch switch-toggle-wrap" data-switch-id={def.id}>
        <button
          type="button"
          className={'switch-opt switch-toggle' + (on ? ' on' : '')}
          aria-pressed={on}
          aria-label={def.label}
          onClick={() => setI(on ? 0 : 1)}
        >
          {current}
        </button>
      </div>
    );
  }

  if (count > 4) {
    return (
      <Select
        label={def.label}
        value={current}
        options={def.options}
        onChange={(v) => setI(def.options.indexOf(v))}
      />
    );
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const d =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (d === 0 || count === 0) return;
    e.preventDefault();
    const next = (i + d + count) % count;
    setI(next);
    // APG: focus follows selection in a radiogroup, or a screen reader announces nothing.
    e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <div
      className="switch"
      role="radiogroup"
      aria-label={def.label}
      data-switch-id={def.id}
      onKeyDown={onKeyDown}
    >
      <span className="switch-label">{def.label}</span>
      <span className="switch-opts">
        {def.options.map((o, idx) => (
          <button
            key={idx}
            type="button"
            role="radio"
            className={'switch-opt' + (idx === i ? ' on' : '')}
            aria-checked={idx === i}
            tabIndex={idx === i ? 0 : -1}
            onClick={() => setI(idx)}
          >
            {o}
          </button>
        ))}
      </span>
    </div>
  );
}
