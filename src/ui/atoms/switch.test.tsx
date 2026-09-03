import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ModuleDef, SwitchDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { useRackStore } from '../../state/rack-store';
import { Switch } from './switch';

const SW: SwitchDef = { id: 'mode', label: 'MODE', options: ['LP', 'BP', 'HP'] };

const def: ModuleDef = {
  id: 'test-switch',
  name: 'TEST',
  sub: 'SW',
  hp: 4,
  cat: 'FILTERS',
  native: 'test',
  knobs: [],
  sws: [SW],
  ins: [],
  outs: [],
};

let host: HTMLDivElement;
let root: Root;
let m: ModuleInstance;

const opts = (): HTMLButtonElement[] => [...host.querySelectorAll('button')];
const arrow = (k: string): void =>
  act(() => {
    const group = host.querySelector('[role="radiogroup"]');
    group?.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  m = { uid: 1, def, jacks: { in: {}, out: {} }, vals: {}, sws: { mode: 0 }, ext: {} };
  useRackStore.getState().addModuleInstance(m, 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Switch m={m} def={SW} />));
  opts()[0]?.focus();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe('Switch', () => {
  it('roving tabIndex marks only the checked option', () => {
    expect(opts().map((b) => b.tabIndex)).toEqual([0, -1, -1]);
  });

  it('focus follows selection on arrow keys', () => {
    arrow('ArrowRight');
    expect(m.sws.mode).toBe(1);
    expect(document.activeElement).toBe(opts()[1]);
    expect(opts()[1]?.getAttribute('aria-checked')).toBe('true');
    arrow('ArrowLeft');
    expect(document.activeElement).toBe(opts()[0]);
  });

  it('arrows wrap around, focus with them', () => {
    arrow('ArrowLeft');
    expect(m.sws.mode).toBe(2);
    expect(document.activeElement).toBe(opts()[2]);
  });
});

describe('Switch with one option', () => {
  const TOGGLE: SwitchDef = { id: 'm1', label: 'MUTE 1', options: ['M'] };
  const toggleDef: ModuleDef = { ...def, id: 'test-toggle', sws: [TOGGLE] };
  let tHost: HTMLDivElement;
  let tRoot: Root;
  let tm: ModuleInstance;

  beforeEach(() => {
    tm = { uid: 2, def: toggleDef, jacks: { in: {}, out: {} }, vals: {}, sws: { m1: 0 }, ext: {} };
    useRackStore.getState().addModuleInstance(tm, 0);
    tHost = document.createElement('div');
    document.body.appendChild(tHost);
    tRoot = createRoot(tHost);
    act(() => tRoot.render(<Switch m={tm} def={TOGGLE} />));
  });

  afterEach(() => {
    act(() => tRoot.unmount());
    tHost.remove();
  });

  it('renders a single lit push-button that toggles 0 and 1, not a radiogroup', () => {
    expect(tHost.querySelector('[role="radiogroup"]')).toBeNull();
    const btn = tHost.querySelector<HTMLButtonElement>('button.switch-toggle');
    expect(btn?.textContent).toBe('M');
    expect(btn?.getAttribute('aria-label')).toBe('MUTE 1');
    expect(btn?.getAttribute('aria-pressed')).toBe('false');
    act(() => btn?.click());
    expect(useRackStore.getState().modules[2]?.sws.m1).toBe(1);
    expect(tHost.querySelector('button.switch-toggle')?.getAttribute('aria-pressed')).toBe('true');
    act(() => tHost.querySelector<HTMLButtonElement>('button.switch-toggle')?.click());
    expect(useRackStore.getState().modules[2]?.sws.m1).toBe(0);
  });
});
