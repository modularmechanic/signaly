import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ModuleDef } from '../core/types';
import { registerSpec } from '../modules/registry';
import { useRackStore } from '../state/rack-store';
import { useSettingsStore } from '../state/settings-store';
import { addModule, addRow, clearRack, connectCable, setParam } from './rack';
import { applySnapshot, isRackSnapshot, snapshotRack, type RackSnapshot } from './snapshot';

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
  port = { postMessage: (): void => undefined, close: (): void => undefined, onmessage: null };
  connect(): void {}
  disconnect(): void {}
}

const SRC: ModuleDef = {
  id: 'ssrc',
  name: 'SRC',
  sub: 'test',
  hp: 4,
  cat: 'SOURCES',
  worklet: 'ssrc',
  knobs: [{ id: 'freq', label: 'FREQ', min: 0, max: 100, initial: 10 }],
  ins: [],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};

const DST: ModuleDef = {
  id: 'sdst',
  name: 'DST',
  sub: 'test',
  hp: 4,
  cat: 'OUTPUT',
  worklet: 'sdst',
  knobs: [],
  ins: [{ id: 'in', label: 'IN', kind: 'a' }],
  outs: [],
};

const valid = (): RackSnapshot => ({
  modules: [
    { mtype: 'ssrc', uid: 1, vals: { freq: 42 }, sws: {} },
    { mtype: 'sdst', uid: 2, vals: {}, sws: {} },
  ],
  cables: [{ id: 1, from: { uid: 1, jack: 'out' }, to: { uid: 2, jack: 'in' } }],
  rows: [[1], [2]],
});

const loaded: unknown[] = [];

beforeAll(() => {
  vi.stubGlobal('AudioWorkletNode', FakeWorkletNode);
  registerSpec({ def: SRC });
  registerSpec({ def: DST });
  registerSpec({ def: { ...SRC, id: 'swide', worklet: 'swide', hp: 40 } });
  registerSpec({ def: { ...SRC, id: 'swide2', worklet: 'swide2', hp: 40 } });
  registerSpec({
    def: { ...SRC, id: 'sext', worklet: 'sext' },
    serialize: {
      save: () => 'good',
      load: (_m, o) => void loaded.push(o),
      validate: (o) => o === 'good',
    },
  });
});

beforeEach(() => {
  clearRack();
  useSettingsStore.getState().setRowWidthHp(104);
});

describe('snapshot', () => {
  it('round-trips a two-module patch', () => {
    const a = addModule('ssrc');
    addRow();
    const b = addModule('sdst', 1);
    if (!a || !b) throw new Error('setup failed');
    setParam(a.uid, 'freq', 42);
    connectCable({ uid: a.uid, jack: 'out' }, { uid: b.uid, jack: 'in' });

    const snap = snapshotRack();
    expect(isRackSnapshot(snap)).toBe(true);
    expect(snap.rows).toEqual([[a.uid], [b.uid]]);

    applySnapshot(snap);
    const s = useRackStore.getState();
    const modules = Object.values(s.modules);
    expect(modules.map((m) => m.def.id).sort()).toEqual(['sdst', 'ssrc']);
    expect(modules.find((m) => m.def.id === 'ssrc')?.vals.freq).toBe(42);
    expect(s.cables).toHaveLength(1);
    expect(s.rows).toHaveLength(2);
  });

  it('places each row of an over-wide patch without losing a module', () => {
    const wideUids = [1, 2, 3, 4, 5, 6, 7]; // 7 x 40 HP against a 120 HP row
    const snap: RackSnapshot = {
      modules: [
        ...wideUids.map((uid) => ({ mtype: 'swide', uid, vals: {}, sws: {} })),
        { mtype: 'sdst', uid: 8, vals: {}, sws: {} },
      ],
      cables: [],
      rows: [wideUids, [8]],
    };
    applySnapshot(snap);

    const s = useRackStore.getState();
    const modules = Object.values(s.modules);
    expect(modules).toHaveLength(8);
    expect(s.rows.flatMap((r) => r.uids)).toHaveLength(8);
    // the second row is placed first and stays below the first row's overflow; the overflow may
    // join it once it is there, which is the policy a manual add follows (ADR 0002)
    const dst = modules.find((m) => m.def.id === 'sdst');
    const dstRow = s.rows.findIndex((r) => r.uids.includes(dst?.uid ?? -1));
    expect(dstRow).toBeGreaterThan(0);
    const widest = Math.max(
      ...s.rows.map((r) => r.uids.reduce((n, u) => n + (s.modules[u]?.def.hp ?? 0), 0)),
    );
    expect(widest).toBeLessThanOrEqual(useSettingsStore.getState().rowWidthHp);
  });

  it('fills lower rows first so an overflowing row never splits the row below it', () => {
    // 120 HP rows (MIN_ROW_HP): the top snapshot row needs one spill, the bottom row is exactly full.
    const top = [1, 2, 3, 4];
    const bottom = [5, 6, 7];
    const snap: RackSnapshot = {
      modules: [
        ...top.map((uid) => ({ mtype: 'swide', uid, vals: {}, sws: {} })),
        ...bottom.map((uid) => ({ mtype: 'swide2', uid, vals: {}, sws: {} })),
      ],
      cables: [],
      rows: [top, bottom],
    };
    applySnapshot(snap);

    const s = useRackStore.getState();
    expect(Object.values(s.modules)).toHaveLength(7);
    const idOf = (uid: number): string | undefined => s.modules[uid]?.def.id;
    const bottomRows = s.rows.filter((r) => r.uids.some((uid) => idOf(uid) === 'swide2'));
    expect(bottomRows).toHaveLength(1);
    // ...and the row above's overflow did not take a slot in it either
    expect(bottomRows[0]?.uids).toHaveLength(3);
    const firstTop = s.rows.findIndex((r) => r.uids.some((uid) => idOf(uid) === 'swide'));
    expect(s.rows.indexOf(bottomRows[0]!)).toBeGreaterThan(firstTop);
  });

  it('skips unknown module types instead of throwing', () => {
    const snap = valid();
    snap.modules[0] = { mtype: 'nope', uid: 1, vals: {}, sws: {} };
    applySnapshot(snap);
    const modules = Object.values(useRackStore.getState().modules);
    expect(modules).toHaveLength(1);
    expect(useRackStore.getState().cables).toHaveLength(0);
  });

  it('only hands ext to load when the serializer validates it', () => {
    const ext = (o: unknown): RackSnapshot => ({
      modules: [{ mtype: 'sext', uid: 1, vals: {}, sws: {}, ext: o }],
      cables: [],
      rows: [[1]],
    });
    loaded.length = 0;
    applySnapshot(ext({ evil: true }));
    expect(loaded).toEqual([]);
    applySnapshot(ext('good'));
    expect(loaded).toEqual(['good']);
  });

  it('rejects malformed input', () => {
    expect(isRackSnapshot(null)).toBe(false);
    expect(isRackSnapshot({})).toBe(false);
    expect(isRackSnapshot({ modules: [], cables: [], rows: {} })).toBe(false);
    expect(isRackSnapshot({ ...valid(), modules: [{ mtype: '', uid: 1, vals: {}, sws: {} }] })).toBe(false);
    expect(isRackSnapshot({ ...valid(), modules: [{ mtype: 'ssrc', uid: 1.5, vals: {}, sws: {} }] })).toBe(
      false,
    );
    expect(
      isRackSnapshot({
        ...valid(),
        modules: [{ mtype: 'ssrc', uid: 1, vals: { a: 'x' }, sws: {} }],
      }),
    ).toBe(false);
    // two cables into the same input jack
    expect(
      isRackSnapshot({
        ...valid(),
        cables: [
          { id: 1, from: { uid: 1, jack: 'out' }, to: { uid: 2, jack: 'in' } },
          { id: 2, from: { uid: 1, jack: 'out' }, to: { uid: 2, jack: 'in' } },
        ],
      }),
    ).toBe(false);
    // a module missing from every row
    expect(isRackSnapshot({ ...valid(), rows: [[1]] })).toBe(false);
    expect(isRackSnapshot(valid())).toBe(true);
  });
});
