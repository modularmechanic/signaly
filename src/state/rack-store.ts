import { create } from 'zustand';
import type { Cable, ModuleInstance, RackRow } from '../engine/types';

/** A jack address inside a connected-jack set: `in:<jackId>` / `out:<jackId>`. */
export function jackSlot(dir: 'in' | 'out', jack: string): string {
  return `${dir}:${jack}`;
}

let nextRowId = 1;
const newRow = (): RackRow => ({ id: `row-${nextRowId++}`, uids: [] });

export interface RackState {
  modules: Record<number, ModuleInstance>;
  cables: Cable[];
  rows: RackRow[];
  /** bumps on every structural change (modules / cables / rows) */
  revision: number;
  /** per-module param+switch write counter; read via selectModuleRevision */
  moduleRev: Record<number, number>;
  getModule(uid: number): ModuleInstance | undefined;
  addModuleInstance(m: ModuleInstance, rowIdx: number): void;
  removeModuleInstance(uid: number): void;
  addCable(c: Cable): void;
  removeCable(id: number): void;
  setVal(uid: number, id: string, v: number): void;
  setSw(uid: number, id: string, i: number): void;
  addRow(): string;
  removeRow(rowId: string): void;
  placeModule(uid: number, toRow: number, toIndex: number): void;
  reset(): void;
}

export const useRackStore = create<RackState>((set, get) => ({
  modules: {},
  cables: [],
  rows: [newRow()],
  revision: 0,
  moduleRev: {},

  getModule: (uid) => get().modules[uid],

  addModuleInstance: (m, rowIdx) =>
    set((s) => ({
      modules: { ...s.modules, [m.uid]: m },
      rows: s.rows.map((r, i) => (i === rowIdx ? { ...r, uids: [...r.uids, m.uid] } : r)),
      revision: s.revision + 1,
    })),

  removeModuleInstance: (uid) =>
    set((s) => {
      const modules = { ...s.modules };
      delete modules[uid];
      const moduleRev = { ...s.moduleRev };
      delete moduleRev[uid];
      return {
        modules,
        moduleRev,
        rows: s.rows.map((r) => ({ ...r, uids: r.uids.filter((u) => u !== uid) })),
        cables: s.cables.filter((c) => c.from.uid !== uid && c.to.uid !== uid),
        revision: s.revision + 1,
      };
    }),

  addCable: (c) => set((s) => ({ cables: [...s.cables, c], revision: s.revision + 1 })),
  removeCable: (id) =>
    set((s) => ({ cables: s.cables.filter((c) => c.id !== id), revision: s.revision + 1 })),

  // vals/sws are mutated in place: instances are identity-stable and audio reads them.
  setVal: (uid, id, v) =>
    set((s) => {
      const m = s.modules[uid];
      if (!m) return s;
      m.vals[id] = v;
      return { moduleRev: { ...s.moduleRev, [uid]: (s.moduleRev[uid] ?? 0) + 1 } };
    }),

  setSw: (uid, id, i) =>
    set((s) => {
      const m = s.modules[uid];
      if (!m) return s;
      m.sws[id] = i;
      return { moduleRev: { ...s.moduleRev, [uid]: (s.moduleRev[uid] ?? 0) + 1 } };
    }),

  addRow: () => {
    const row = newRow();
    set((s) => ({ rows: [...s.rows, row], revision: s.revision + 1 }));
    return row.id;
  },

  removeRow: (rowId) =>
    set((s) => {
      const row = s.rows.find((r) => r.id === rowId);
      if (!row || row.uids.length > 0 || s.rows.length <= 1) return s;
      return { rows: s.rows.filter((r) => r.id !== rowId), revision: s.revision + 1 };
    }),

  placeModule: (uid, toRow, toIndex) =>
    set((s) => {
      if (toRow < 0 || toRow >= s.rows.length) return s;
      const rows = s.rows.map((r) => ({ ...r, uids: r.uids.filter((u) => u !== uid) }));
      const target = rows[toRow];
      if (!target) return s;
      target.uids.splice(Math.max(0, Math.min(toIndex, target.uids.length)), 0, uid);
      return { rows, revision: s.revision + 1 };
    }),

  reset: () =>
    set((s) => ({ modules: {}, cables: [], rows: [newRow()], moduleRev: {}, revision: s.revision + 1 })),
}));

const NO_JACKS: ReadonlySet<string> = new Set();
let indexedCables: readonly Cable[] | null = null;
let connectedByUid = new Map<number, ReadonlySet<string>>();

function sameMembers(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of b) if (!a.has(k)) return false;
  return true;
}

/** Patched jacks of one module. Identity-stable while that module's cables do not change. */
export function connectedJacks(cables: readonly Cable[], uid: number): ReadonlySet<string> {
  if (indexedCables !== cables) {
    const built = new Map<number, Set<string>>();
    const claim = (u: number, key: string): void => {
      const s = built.get(u);
      if (s) s.add(key);
      else built.set(u, new Set([key]));
    };
    for (const c of cables) {
      claim(c.from.uid, jackSlot('out', c.from.jack));
      claim(c.to.uid, jackSlot('in', c.to.jack));
    }
    const next = new Map<number, ReadonlySet<string>>();
    for (const [u, s] of built) {
      const prev = connectedByUid.get(u);
      next.set(u, prev && sameMembers(prev, s) ? prev : s);
    }
    connectedByUid = next;
    indexedCables = cables;
  }
  return connectedByUid.get(uid) ?? NO_JACKS;
}

/** Selector: one module's param/switch revision — a scalar, cheap to diff. */
export const selectModuleRevision =
  (uid: number) =>
  (s: RackState): number =>
    s.moduleRev[uid] ?? 0;

/** Selector: the patched jacks of one module, without subscribing to `cables` identity. */
export const selectConnectedJacks =
  (uid: number) =>
  (s: RackState): ReadonlySet<string> =>
    connectedJacks(s.cables, uid);

export const useModule = (uid: number): ModuleInstance | undefined => useRackStore((s) => s.modules[uid]);
