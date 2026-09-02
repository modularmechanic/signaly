import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../core/types';
import { registerSpec } from '../modules/registry';
import { useRackStore } from '../state/rack-store';
import { useSettingsStore } from '../state/settings-store';
import {
  addModule,
  addRow,
  clearRack,
  connectCable,
  duplicateModule,
  getLastRowRejection,
  moveModule,
  removeModule,
  rowUsedHp,
  setParam,
  setSwitch,
} from './rack';
import type { ModuleInstance } from './types';

vi.mock('./audio-context', () => ({
  getAudioContext: () => ({
    createGain: () => ({ gain: { value: 0 }, connect: () => undefined, disconnect: () => undefined }),
    destination: {},
  }),
  loadWorklet: () => Promise.resolve(),
  isWorkletReady: () => true,
  isRunning: () => true,
  resume: () => undefined,
}));

class FakeWorkletNode {
  sent: unknown[] = [];
  port = {
    postMessage: (m: unknown): void => {
      this.sent.push(m);
    },
    close: (): void => undefined,
    onmessage: null,
  };
  connect(): void {}
  disconnect(): void {}
}

const SRC: ModuleDef = {
  id: 'tsrc',
  name: 'SRC',
  sub: 'test',
  hp: 2,
  cat: 'SOURCES',
  worklet: 'tsrc',
  knobs: [],
  ins: [],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};

const FLT: ModuleDef = {
  id: 'tflt',
  name: 'FLT',
  sub: 'test',
  hp: 6,
  cat: 'FILTERS',
  worklet: 'tflt',
  knobs: [
    { id: 'cut', label: 'CUT', min: 0, max: 100, def: 50 },
    { id: 'amt', label: 'AMT', min: -1, max: 1, def: 0, attenuates: 'cv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['LP', 'HP'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};

const add = (id: string, row?: number): ModuleInstance => {
  const m = addModule(id, row);
  if (!m) throw new Error(`addModule(${id}) was rejected`);
  return m;
};

const sentOf = (m: ModuleInstance): unknown[] => (m.node as unknown as FakeWorkletNode).sent;
const firstRowId = (): string => useRackStore.getState().rows[0]?.id ?? '';

beforeAll(() => {
  vi.stubGlobal('AudioWorkletNode', FakeWorkletNode);
  registerSpec({ def: SRC });
  registerSpec({ def: FLT });
});

beforeEach(() => {
  clearRack();
  useSettingsStore.getState().setRowWidthHp(104);
});

describe('rack', () => {
  it('keeps one cable per input jack, replacing the previous one', () => {
    const a = add('tsrc');
    const b = add('tsrc');
    const f = add('tflt');
    connectCable({ uid: a.uid, jack: 'out' }, { uid: f.uid, jack: 'in' });
    connectCable({ uid: b.uid, jack: 'out' }, { uid: f.uid, jack: 'in' });
    const into = useRackStore.getState().cables.filter((c) => c.to.uid === f.uid && c.to.jack === 'in');
    expect(into).toHaveLength(1);
    expect(into[0]?.from.uid).toBe(b.uid);
  });

  it('inserts an attenuverter gain in front of a c-kind input', () => {
    const f = add('tflt');
    const cv = f.cvGains?.cv;
    expect(cv).toBeDefined();
    expect(f.jacks.in.cv?.node).toBe(cv?.node);
    setParam(f.uid, 'amt', 0.5);
    expect(cv?.node.gain.value).toBe(0.5);
    // The knob drives the CV gain AND is still pushed: a native module may render the value
    // (volt's readout does), and no worklet DSP reads an attenuverting knob id.
    expect(sentOf(f)).toContainEqual({ t: 'p', id: 'amt', v: 0.5 });
  });

  it('drops dependent cables when a module is removed', () => {
    const a = add('tsrc');
    const f = add('tflt');
    connectCable({ uid: a.uid, jack: 'out' }, { uid: f.uid, jack: 'in' });
    expect(useRackStore.getState().cables).toHaveLength(1);
    removeModule(f.uid);
    expect(useRackStore.getState().cables).toHaveLength(0);
    expect(useRackStore.getState().modules[f.uid]).toBeUndefined();
  });

  it('posts clamped param and switch changes to the worklet', () => {
    const f = add('tflt');
    setParam(f.uid, 'cut', 30);
    setParam(f.uid, 'cut', 999);
    setParam(f.uid, 'cut', Number.NaN);
    setSwitch(f.uid, 'mode', 5);
    expect(sentOf(f)).toEqual([
      { t: 'p', id: 'cut', v: 30 },
      { t: 'p', id: 'cut', v: 100 },
      { t: 'p', id: 'mode', v: 1 },
    ]);
    expect(f.vals.cut).toBe(100);
    expect(f.sws.mode).toBe(1);
  });

  it('refuses adds, duplicates and moves that overflow the row width', () => {
    useSettingsStore.getState().setRowWidthHp(20);
    const f = add('tflt');
    add('tflt');
    add('tflt');
    expect(rowUsedHp(firstRowId())).toBe(18);
    expect(addModule('tflt')).toBeNull();
    expect(getLastRowRejection()).toEqual({ needed: 6, free: 2 });
    expect(duplicateModule(f.uid)).toBeNull();

    addRow();
    expect(moveModule(f.uid, 1, 0)).toBe(true);
    expect(rowUsedHp(firstRowId())).toBe(12);
    // moving inside its own row does not count its HP twice
    expect(moveModule(f.uid, 1, 0)).toBe(true);
  });

  it('duplicates knob and switch state without cables', () => {
    const a = add('tsrc');
    const f = add('tflt');
    setParam(f.uid, 'cut', 12);
    setSwitch(f.uid, 'mode', 1);
    connectCable({ uid: a.uid, jack: 'out' }, { uid: f.uid, jack: 'in' });
    const clone = duplicateModule(f.uid);
    expect(clone?.vals.cut).toBe(12);
    expect(clone?.sws.mode).toBe(1);
    expect(useRackStore.getState().cables.filter((c) => c.to.uid === clone?.uid)).toHaveLength(0);
  });
});
