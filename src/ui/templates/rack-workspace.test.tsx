import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../../core/types';
import type { ModuleInstance } from '../../engine/types';
import { armJack } from '../../hooks/patch-state';
import { registerSpec, unregisterSpec } from '../../modules/registry';
import { useRackStore } from '../../state/rack-store';
import { useSettingsStore } from '../../state/settings-store';
import { useUiStore } from '../../state/ui-store';
import { RackWorkspace } from './rack-workspace';

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({ createGain: () => ({ gain: { value: 0 }, connect: () => undefined }) }),
  loadWorklet: () => Promise.resolve(),
  isWorkletReady: () => true,
  isRunning: () => true,
  resume: () => undefined,
}));

const fakeNode = (): AudioNode =>
  ({ connect: () => undefined, disconnect: () => undefined }) as unknown as AudioNode;

const DEF: ModuleDef = {
  id: 'twork',
  name: 'TEST',
  sub: 'fixture',
  hp: 4,
  cat: 'UTILITY',
  knobs: [],
  ins: [{ id: 'i', label: 'IN', kind: 'a' }],
  outs: [{ id: 'o', label: 'OUT', kind: 'a' }],
};

const instance = (uid: number): ModuleInstance => {
  const node = fakeNode();
  return {
    uid,
    def: DEF,
    jacks: { in: { i: { node, idx: 0 } }, out: { o: { node, idx: 0 } } },
    vals: {},
    sws: {},
    ext: {},
  };
};

let host: HTMLDivElement;
let root: Root;

const live = (): string => host.querySelector('[aria-live="polite"]')?.textContent ?? '';

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  useRackStore.getState().reset();
  useUiStore.getState().setNotice(null);
  useSettingsStore.getState().setZoom(1);
  useRackStore.getState().addModuleInstance(instance(101), 0);
  useRackStore.getState().addModuleInstance(instance(102), 0);
  host = document.createElement('div');
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<RackWorkspace />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const zoomBtn = (label: string): HTMLButtonElement => {
  const el = host.querySelector<HTMLButtonElement>(`.zoom-dock [aria-label^="${label}"]`);
  if (!el) throw new Error(`no ${label} button`);
  return el;
};
const rackZoom = (): string => document.documentElement.style.getPropertyValue('--rack-zoom');

describe('RackWorkspace zoom dock', () => {
  it('drives the rack surface from a CSS variable, so a zoom change re-renders no panel', () => {
    expect(rackZoom()).toBe('1');
    act(() => zoomBtn('Zoom in').click());
    expect(Number(rackZoom())).toBeGreaterThan(1);
    act(() => zoomBtn('Zoom out').click());
    expect(Number(rackZoom())).toBeCloseTo(1, 6);
  });

  it('zooms in without a ceiling and resets from the level readout', () => {
    for (let i = 0; i < 30; i++) act(() => zoomBtn('Zoom in').click());
    expect(Number(rackZoom())).toBeGreaterThan(100);
    act(() => host.querySelector<HTMLButtonElement>('.zoom-level')?.click());
    expect(rackZoom()).toBe('1');
  });

  it('floors zooming out so the rack never becomes unreadable', () => {
    for (let i = 0; i < 30; i++) act(() => zoomBtn('Zoom out').click());
    expect(Number(rackZoom())).toBe(0.2);
  });
});

describe('RackWorkspace live region', () => {
  it('announces the ui-store notice', () => {
    act(() => useUiStore.getState().setNotice('Row full — 8 HP needed, 2 free'));
    expect(live()).toBe('Row full — 8 HP needed, 2 free');
  });

  it('announces a completed keyboard patch', () => {
    act(() => armJack(101, 'out', 'o'));
    expect(live()).toBe('Armed o output — pick a destination');
    act(() => armJack(102, 'in', 'i'));
    expect(live()).toBe('Patched TEST o to TEST i');
  });

  it('adds the module picked in the browser to the target row', () => {
    registerSpec({ def: { ...DEF, id: 'tpick', name: 'PICKME' } });
    act(() => useUiStore.getState().setBrowserOpen(true));
    const item = [...host.querySelectorAll('.browser-item')].find((el) => el.textContent?.includes('PICKME'));
    act(() => item?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    unregisterSpec('tpick');

    const added = Object.values(useRackStore.getState().modules).filter((m) => m.def.id === 'tpick');
    expect(added).toHaveLength(1);
    expect(useRackStore.getState().rows[0]?.uids).toContain(added[0]?.uid);
    expect(live()).toBe('Added PICKME to row 1');
  });

  it('gives each row its own keyboard-reachable horizontal scroll container', () => {
    const scrollers = [...host.querySelectorAll<HTMLElement>('.rack-row-scroll')];
    expect(scrollers).toHaveLength(1);
    expect(scrollers[0]?.tabIndex).toBe(0);
    expect(scrollers[0]?.getAttribute('aria-label')).toBe('Row 1 modules');
    // Independent per row: the scroll container wraps only that row's modules, not the whole rack.
    expect(scrollers[0]?.querySelectorAll('.module-panel')).toHaveLength(2);
  });

  it('announces an added row', () => {
    const add = [...host.querySelectorAll('button')].find((b) => b.textContent === '+ Row');
    act(() => add?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(live()).toBe('Row 2 added');
  });

  it('announces a cancelled arm', async () => {
    act(() => armJack(101, 'out', 'o'));
    await act(async () => armJack(101, 'out', 'o'));
    expect(live()).toBe('Patch cancelled');
  });
});
