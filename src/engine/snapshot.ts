import { getSpec } from '../modules/registry';
import { useRackStore } from '../state/rack-store';
import { addModule, addRow, clearRack, connectCable, setParam, setSwitch } from './rack';

export interface ModuleSnapshot {
  mtype: string;
  uid: number;
  vals: Record<string, number>;
  sws: Record<string, number>;
  ext?: unknown;
}

export interface CableSnapshot {
  id: number;
  from: { uid: number; jack: string };
  to: { uid: number; jack: string };
}

export interface RackSnapshot {
  modules: ModuleSnapshot[];
  cables: CableSnapshot[];
  rows: number[][];
}

export interface PatchFile {
  format: 'signaly.patch';
  version: 1;
  name: string;
  snapshot: RackSnapshot;
}

export const LIMITS = { modules: 500, cables: 2000, rows: 32, jackLen: 64, mtypeLen: 120 } as const;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isId = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0;

function isNumberRecord(v: unknown): v is Record<string, number> {
  if (!isRecord(v)) return false;
  return Object.values(v).every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isJack(v: unknown): v is { uid: number; jack: string } {
  return (
    isRecord(v) &&
    isId(v.uid) &&
    typeof v.jack === 'string' &&
    v.jack.length > 0 &&
    v.jack.length <= LIMITS.jackLen
  );
}

/** Deep guard for untrusted imported JSON. Callers cap the raw file at 2 MB before parsing. */
export function isRackSnapshot(o: unknown): o is RackSnapshot {
  if (!isRecord(o)) return false;
  const { modules, cables, rows } = o;
  if (!Array.isArray(modules) || !Array.isArray(cables) || !Array.isArray(rows)) return false;
  if (modules.length > LIMITS.modules || cables.length > LIMITS.cables || rows.length > LIMITS.rows)
    return false;

  const uids = new Set<number>();
  for (const m of modules) {
    if (
      !isRecord(m) ||
      typeof m.mtype !== 'string' ||
      m.mtype.trim().length === 0 ||
      m.mtype.length > LIMITS.mtypeLen ||
      !isId(m.uid) ||
      uids.has(m.uid) ||
      !isNumberRecord(m.vals) ||
      !isNumberRecord(m.sws)
    )
      return false;
    uids.add(m.uid);
  }

  const cableIds = new Set<number>();
  const usedInputs = new Set<string>();
  for (const c of cables) {
    if (!isRecord(c) || !isId(c.id) || cableIds.has(c.id) || !isJack(c.from) || !isJack(c.to)) return false;
    if (!uids.has(c.from.uid) || !uids.has(c.to.uid)) return false;
    const inKey = `${c.to.uid}:${c.to.jack}`;
    if (usedInputs.has(inKey)) return false;
    cableIds.add(c.id);
    usedInputs.add(inKey);
  }

  const placed = new Set<number>();
  for (const row of rows) {
    if (!Array.isArray(row)) return false;
    for (const uid of row) {
      if (!isId(uid) || !uids.has(uid) || placed.has(uid)) return false;
      placed.add(uid);
    }
  }
  return placed.size === uids.size;
}

export function snapshotRack(): RackSnapshot {
  const s = useRackStore.getState();
  const modules: ModuleSnapshot[] = Object.values(s.modules).map((m) => {
    const snap: ModuleSnapshot = { mtype: m.def.id, uid: m.uid, vals: { ...m.vals }, sws: { ...m.sws } };
    const serialize = getSpec(m.def.id)?.serialize;
    if (serialize) snap.ext = JSON.parse(JSON.stringify(serialize.save(m) ?? null)) as unknown;
    return snap;
  });
  const cables: CableSnapshot[] = s.cables.map((c) => ({
    id: c.id,
    from: { ...c.from },
    to: { ...c.to },
  }));
  return { modules, cables, rows: s.rows.map((r) => [...r.uids]) };
}

/** Rebuild the rack from a validated snapshot. Unknown mtypes and over-capacity rows are
    skipped, never thrown: the remaining modules still load. */
export function applySnapshot(s: RackSnapshot): void {
  clearRack();
  const byUid = new Map(s.modules.map((m) => [m.uid, m]));
  const remap = new Map<number, number>();

  s.rows.forEach((rowUids, rowIdx) => {
    if (rowIdx > 0) addRow();
    for (const oldUid of rowUids) {
      const ms = byUid.get(oldUid);
      if (!ms) continue;
      const inst = addModule(ms.mtype, rowIdx);
      if (!inst) continue;
      remap.set(oldUid, inst.uid);
      Object.entries(ms.vals).forEach(([id, v]) => setParam(inst.uid, id, v));
      Object.entries(ms.sws).forEach(([id, i]) => setSwitch(inst.uid, id, i));
      const serialize = getSpec(ms.mtype)?.serialize;
      if (serialize && ms.ext !== undefined && (serialize.validate?.(ms.ext) ?? true)) {
        try {
          serialize.load(inst, ms.ext);
        } catch {
          /* a bad ext blob restores defaults */
        }
      }
    }
  });

  for (const c of s.cables) {
    const from = remap.get(c.from.uid);
    const to = remap.get(c.to.uid);
    if (from === undefined || to === undefined) continue;
    connectCable({ uid: from, jack: c.from.jack }, { uid: to, jack: c.to.jack });
  }
}
