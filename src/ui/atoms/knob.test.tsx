import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KnobDef, ModuleDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { useRackStore } from '../../state/rack-store';
import { Knob } from './knob';

const CUT: KnobDef = { id: 'cut', label: 'CUTOFF', min: 0, max: 100, def: 50, fmt: 'fHz' };

const def: ModuleDef = {
  id: 'test-knob',
  name: 'TEST',
  sub: 'KNOB',
  hp: 8,
  cat: 'FILTERS',
  native: 'test',
  knobs: [CUT],
  ins: [],
  outs: [],
};

let host: HTMLDivElement;
let root: Root;
let m: ModuleInstance;

const knob = (): HTMLElement => {
  const el = host.querySelector('[role="slider"]');
  if (!el) throw new Error('no slider');
  return el as HTMLElement;
};

const key = (init: KeyboardEventInit): void =>
  act(() => {
    knob().dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  m = { uid: 1, def, jacks: { in: {}, out: {} }, vals: { cut: 50 }, sws: {}, ext: {} };
  useRackStore.getState().addModuleInstance(m, 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Knob m={m} def={CUT} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Knob', () => {
  it('exposes the ARIA slider contract', () => {
    const el = knob();
    expect(el.getAttribute('aria-label')).toBe('CUTOFF');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('50');
    expect(el.tabIndex).toBe(0);
  });

  it('aria-valuetext uses the def formatter', () => {
    expect(knob().getAttribute('aria-valuetext')).toBe('50.0 Hz');
  });

  it('ArrowRight steps up and ArrowLeft steps down by 1% of range', () => {
    key({ key: 'ArrowRight' });
    expect(m.vals.cut).toBe(51);
    key({ key: 'ArrowLeft' });
    expect(m.vals.cut).toBe(50);
  });

  it('Shift+ArrowRight is a finer step', () => {
    key({ key: 'ArrowRight', shiftKey: true });
    expect(m.vals.cut).toBeCloseTo(50.1, 5);
  });

  it('PageUp/PageDown take a large step', () => {
    key({ key: 'PageUp' });
    expect(m.vals.cut).toBe(60);
    key({ key: 'PageDown' });
    expect(m.vals.cut).toBe(50);
  });

  it('Home and End clamp to min and max', () => {
    key({ key: 'Home' });
    expect(m.vals.cut).toBe(0);
    expect(knob().getAttribute('aria-valuenow')).toBe('0');
    key({ key: 'ArrowLeft' });
    expect(m.vals.cut).toBe(0);
    key({ key: 'End' });
    expect(m.vals.cut).toBe(100);
    key({ key: 'ArrowRight' });
    expect(m.vals.cut).toBe(100);
  });

  it('ignores keys outside the slider set', () => {
    key({ key: 'a' });
    expect(m.vals.cut).toBe(50);
  });
});
