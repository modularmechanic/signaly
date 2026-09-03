import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { KnobDef, ModuleDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { useRackStore } from '../../state/rack-store';
import { Knob, knobValue } from './knob';

const CUT: KnobDef = { id: 'cut', label: 'CUTOFF', min: 0, max: 100, initial: 50, fmt: 'fHz' };
const LOG: KnobDef = {
  id: 'cut',
  label: 'CUTOFF',
  min: 30,
  max: 16000,
  initial: 800,
  fmt: 'fHz',
  curve: 'log',
};

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
const extra: Array<[Root, HTMLDivElement]> = [];

/** Mounts a throwaway knob at `v` and returns its slider element. */
const renderAt = (d: KnobDef, v: number): HTMLElement => {
  const h = document.createElement('div');
  document.body.appendChild(h);
  const r = createRoot(h);
  extra.push([r, h]);
  const mi: ModuleInstance = {
    uid: 2,
    def: { ...def, id: 'k2', knobs: [d] },
    jacks: { in: {}, out: {} },
    vals: { [d.id]: v },
    sws: {},
    ext: {},
  };
  act(() => r.render(<Knob m={mi} def={d} />));
  const el = h.querySelector('[role="slider"]');
  if (!el) throw new Error('no slider');
  return el as HTMLElement;
};

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
  for (const [r, h] of extra.splice(0)) {
    act(() => r.unmount());
    h.remove();
  }
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

  it('a drag latches its axis instead of flipping mid-gesture', () => {
    const el = knob() as HTMLElement & { setPointerCapture: () => void };
    el.setPointerCapture = (): void => undefined;
    el.hasPointerCapture = (): boolean => false;
    const at = (type: string, x: number, y: number): void =>
      act(() => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
      });
    at('pointerdown', 0, 0);
    at('pointermove', 10, 9); // x wins by a hair -> x mapping
    expect(m.vals.cut).toBeCloseTo(56, 6);
    at('pointermove', 10, 40); // y now dominates, but the axis is latched
    expect(m.vals.cut).toBeCloseTo(56, 6);
    at('pointerup', 10, 40);
  });

  it('a move inside the slop radius does not pick an axis yet', () => {
    const el = knob() as HTMLElement & { setPointerCapture: () => void };
    el.setPointerCapture = (): void => undefined;
    el.hasPointerCapture = (): boolean => false;
    const at = (type: string, x: number, y: number): void =>
      act(() => {
        el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
      });
    at('pointerdown', 0, 0);
    at('pointermove', 2, 2);
    expect(m.vals.cut).toBe(50);
    at('pointermove', 2, 40); // first move past the slop -> y mapping
    expect(m.vals.cut).toBeCloseTo(50 - 40 * 0.006 * 100, 6);
    at('pointerup', 2, 40);
  });

  it('pointer angle and ring pct share one -135deg..+135deg sweep, lin and log', () => {
    for (const d of [CUT, LOG]) {
      for (const n of [0, 0.25, 0.5, 0.75, 1]) {
        const el = renderAt(d, knobValue(d, n));
        expect(Number(el.style.getPropertyValue('--pct'))).toBeCloseTo(n, 6);
        const deg = /rotate\((-?[\d.]+)deg\)/.exec(
          (el.querySelector('.knob-cap') as HTMLElement).style.transform,
        )?.[1];
        expect(Number(deg)).toBeCloseTo(-135 + n * 270, 1);
      }
    }
  });
});
