import { getSpec } from '../modules/registry';
import { useRackStore } from '../state/rack-store';
import { useSettingsStore } from '../state/settings-store';
import { makeNode, pushParam } from './node-factory';
import { connect, disconnect } from './patch';
import type { Cable, ModuleInstance, RackRow } from './types';

let nextUid = 1;
let nextCableId = 1;

/** Why the last move was refused. UI reads it to say "Row full — N HP needed, M free". */
let lastRowRejection: { needed: number; free: number } | null = null;
export const getLastRowRejection = (): { needed: number; free: number } | null => lastRowRejection;

/** A module's own failure must never block the rack mutation around it. */
function quietly(fn: () => void): void {
  try {
    fn();
  } catch {
    /* best effort */
  }
}

/** Sum of declared def.hp for the modules in a row. */
export function rowUsedHp(rowId: string): number {
  const s = useRackStore.getState();
  const row = s.rows.find((r) => r.id === rowId);
  return row ? row.uids.reduce((n, uid) => n + (s.modules[uid]?.def.hp ?? 0), 0) : 0;
}

/** Capacity gate. `ownHp` is subtracted for a module already sitting in that row. */
function fits(row: RackRow | undefined, hp: number, ownHp = 0): boolean {
  if (!row) return false;
  const free = useSettingsStore.getState().rowWidthHp - rowUsedHp(row.id) + ownHp;
  if (hp > free) {
    lastRowRejection = { needed: hp, free };
    return false;
  }
  lastRowRejection = null;
  return true;
}

/** Wire or unwire one cable's audio edge, plus the destination's attenuverter gain. */
function wireCable(c: Pick<Cable, 'from' | 'to'>, on: boolean): void {
  const s = useRackStore.getState();
  const outRef = s.modules[c.from.uid]?.jacks.out[c.from.jack];
  const inRef = s.modules[c.to.uid]?.jacks.in[c.to.jack];
  const edge = on ? connect : disconnect;
  if (outRef && inRef) edge(outRef, inRef);
  const cvg = s.modules[c.to.uid]?.cvGains?.[c.to.jack];
  if (cvg) edge({ node: cvg.node, idx: 0 }, cvg.target);
}

/** Tell a native module whether one of its jacks is logically patched. */
function notifyConnectionChange(uid: number, dir: 'in' | 'out', jack: string): void {
  const s = useRackStore.getState();
  const m = s.modules[uid];
  if (!m) return;
  const connected = s.cables.some((c) =>
    dir === 'in' ? c.to.uid === uid && c.to.jack === jack : c.from.uid === uid && c.from.jack === jack,
  );
  quietly(() => getSpec(m.def.id)?.native?.onConnectionChange?.(m, dir, jack, connected));
}

function teardownModule(m: ModuleInstance): void {
  quietly(() => {
    m.node?.disconnect();
    m.node?.port.close();
  });
  // ConstantSource/Oscillator nodes stay live until stopped, even after disconnect.
  m.natives?.forEach((n) =>
    quietly(() => {
      n.disconnect();
      (n as AudioNode & { stop?: () => void }).stop?.();
    }),
  );
  quietly(() => getSpec(m.def.id)?.native?.dispose?.(m));
}

export function addModule(defId: string, row?: number): ModuleInstance | null {
  const spec = getSpec(defId);
  if (!spec) return null;
  if (useRackStore.getState().rows.length === 0) useRackStore.getState().addRow();
  const rows = useRackStore.getState().rows;
  const at = Math.max(0, Math.min(row ?? rows.length - 1, rows.length - 1));
  // An add is never refused. When the target row is full, spill into the row directly beneath if
  // it has room — otherwise a repeat add would mint a row per module — and only then make one.
  const hp = spec.def.hp;
  const rowIdx = fits(rows[at], hp) ? at : fits(rows[at + 1], hp) ? at + 1 : insertRow(at + 1);

  const m: ModuleInstance = {
    uid: nextUid++,
    def: spec.def,
    jacks: { in: {}, out: {} },
    vals: {},
    sws: {},
    ext: {},
  };
  spec.def.knobs.forEach((k) => (m.vals[k.id] = k.initial));
  (spec.def.sws ?? []).forEach((s) => (m.sws[s.id] = s.initial ?? 0));
  makeNode(m, spec.native);
  useRackStore.getState().addModuleInstance(m, rowIdx);
  return m;
}

export function removeModule(uid: number): void {
  const store = useRackStore.getState();
  const m = store.modules[uid];
  if (!m) return;
  store.cables.filter((c) => c.from.uid === uid || c.to.uid === uid).forEach((c) => disconnectCable(c.id));
  useRackStore.getState().removeModuleInstance(uid);
  teardownModule(m);
}

/** Clone into the same row with identical knob/switch/ext state, no cables. */
export function duplicateModule(uid: number): ModuleInstance | null {
  const store = useRackStore.getState();
  const src = store.modules[uid];
  if (!src) return null;
  const rowIdx = store.rows.findIndex((r) => r.uids.includes(uid));
  const clone = addModule(src.def.id, rowIdx < 0 ? undefined : rowIdx);
  if (!clone) return null;
  Object.entries(src.vals).forEach(([id, v]) => setParam(clone.uid, id, v));
  Object.entries(src.sws).forEach(([id, i]) => setSwitch(clone.uid, id, i));
  const spec = getSpec(src.def.id);
  if (spec?.serialize) spec.serialize.load(clone, spec.serialize.save(src));
  return clone;
}

/** One cable per input jack: an existing cable on the destination is pulled first. */
export function connectCable(from: Cable['from'], to: Cable['to']): Cable | null {
  const store = useRackStore.getState();
  const outRef = store.modules[from.uid]?.jacks.out[from.jack];
  const inRef = store.modules[to.uid]?.jacks.in[to.jack];
  if (!outRef || !inRef) return null;

  const occupied = store.cables.find((c) => c.to.uid === to.uid && c.to.jack === to.jack);
  if (occupied) disconnectCable(occupied.id);

  const cable: Cable = { id: nextCableId++, from, to };
  useRackStore.getState().addCable(cable);
  wireCable(cable, true);
  notifyConnectionChange(from.uid, 'out', from.jack);
  notifyConnectionChange(to.uid, 'in', to.jack);
  return cable;
}

export function disconnectCable(id: number): void {
  const cable = useRackStore.getState().cables.find((c) => c.id === id);
  if (!cable) return;
  wireCable(cable, false);
  useRackStore.getState().removeCable(id);
  notifyConnectionChange(cable.from.uid, 'out', cable.from.jack);
  notifyConnectionChange(cable.to.uid, 'in', cable.to.jack);
}

/** Non-finite values are dropped: they reach AudioParam.value and corrupt the node. */
export function setParam(uid: number, id: string, v: number): void {
  if (!Number.isFinite(v)) return;
  const m = useRackStore.getState().modules[uid];
  if (!m || !Object.hasOwn(m.vals, id)) return;
  const knob = m.def.knobs.find((k) => k.id === id);
  const next = knob ? Math.max(knob.min, Math.min(knob.max, v)) : v;
  useRackStore.getState().setVal(uid, id, next);
  const att = knob?.attenuates;
  // Attenuverter: drive the CV-input gain. Still push the param — a native module may render the
  // value (volt's readout does), and no worklet DSP reads an attenuverting knob id.
  if (att && m.cvGains?.[att]) m.cvGains[att].node.gain.value = next;
  pushParam(m, getSpec(m.def.id)?.native, id, next);
}

export function setSwitch(uid: number, id: string, i: number): void {
  if (!Number.isFinite(i)) return;
  const m = useRackStore.getState().modules[uid];
  if (!m || !Object.hasOwn(m.sws, id)) return;
  const def = m.def.sws?.find((s) => s.id === id);
  if (!def) return;
  // A one-option switch is a push-button toggle: its legend is the single option, its value 0 or 1.
  const top = def.options.length === 1 ? 1 : def.options.length - 1;
  const next = Math.max(0, Math.min(top, Math.round(i)));
  useRackStore.getState().setSw(uid, id, next);
  pushParam(m, getSpec(m.def.id)?.native, id, next);
}

export const addRow = (): string => useRackStore.getState().addRow();

/** New empty row at `at`; returns its index. Appends, then slides the row into place. */
export function insertRow(at: number): number {
  useRackStore.getState().addRow();
  const idx = Math.max(0, Math.min(at, useRackStore.getState().rows.length - 1));
  useRackStore.setState((s) => {
    const rows = [...s.rows];
    const row = rows.pop();
    if (!row) return s;
    rows.splice(idx, 0, row);
    return { rows, revision: s.revision + 1 };
  });
  return idx;
}

export const removeRow = (rowId: string): void => useRackStore.getState().removeRow(rowId);

/** Row membership/order only — never touches audio, modules or cables. */
export function moveModule(uid: number, toRow: number, toIndex: number): boolean {
  const store = useRackStore.getState();
  const m = store.modules[uid];
  const target = store.rows[toRow];
  if (!m || !target) return false;
  const sameRow = target.uids.includes(uid);
  if (!fits(target, m.def.hp, sameRow ? m.def.hp : 0)) return false;
  store.placeModule(uid, toRow, toIndex);
  return true;
}

export function clearRack(): void {
  Object.keys(useRackStore.getState().modules).forEach((uid) => removeModule(Number(uid)));
  useRackStore.getState().reset();
}
