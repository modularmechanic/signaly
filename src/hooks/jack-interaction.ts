import type { JackDef } from '../core/types';
import { connectCable, disconnectCable } from '../engine/rack';
import { useRackStore } from '../state/rack-store';
import { getJack, jackKey, setCompat, type JackDir, type JackInfo } from './jack-registry';

/** A jack named the way a person reads it — the announcer never needs the store to describe one. */
export interface JackRef {
  uid: number;
  dir: JackDir;
  def: JackDef;
}

/** What an interaction did. Reported, never inferred from a rack diff. */
export type Outcome =
  | { type: 'none' }
  | { type: 'armed'; jack: JackRef }
  | { type: 'cancelled'; jack: JackRef }
  | { type: 'connected'; from: JackRef; to: JackRef }
  | { type: 'disconnected'; count: number };

const NONE: Outcome = { type: 'none' };

const listeners = new Set<(o: Outcome) => void>();

/** Every reported outcome, in the order it happened. */
export function subscribe(fn: (o: Outcome) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function emit(o: Outcome): Outcome {
  for (const fn of listeners) fn(o);
  return o;
}

const ref = (j: JackRef): { uid: number; jack: string } => ({ uid: j.uid, jack: j.def.id });

/* ---- keyboard patching: arm a jack, then arm its partner ---- */

let armed: JackRef | null = null;
export const getArmed = (): JackRef | null => armed;

function setArmed(a: JackRef | null): void {
  if (armed) setCompat(armed.dir === 'out' ? 'in' : 'out', false);
  armed = a;
  if (a) setCompat(a.dir === 'out' ? 'in' : 'out', true);
}

export function cancelArm(): Outcome {
  const was = armed;
  if (!was) return NONE;
  setArmed(null);
  return emit({ type: 'cancelled', jack: was });
}

/** Arm a jack, or — when a jack of the opposite direction is already armed — patch the pair. */
export function armJack(j: JackRef): Outcome {
  if (armed && armed.dir !== j.dir) {
    const from = j.dir === 'out' ? j : armed;
    const to = j.dir === 'in' ? j : armed;
    setArmed(null);
    const cable = connectCable(ref(from), ref(to));
    return emit(cable ? { type: 'connected', from, to } : NONE);
  }
  if (armed && armed.uid === j.uid && armed.def.id === j.def.id) return cancelArm();
  setArmed(j);
  return emit({ type: 'armed', jack: j });
}

/** Pull every cable off a jack. Inputs hold at most one; an output may fan out to many.
    Stays silent when there was nothing to pull. */
export function unpatchJack(j: JackRef): Outcome {
  const end = j.dir === 'in' ? ('to' as const) : ('from' as const);
  const doomed = useRackStore
    .getState()
    .cables.filter((c) => c[end].uid === j.uid && c[end].jack === j.def.id);
  doomed.forEach((c) => disconnectCable(c.id));
  return doomed.length ? emit({ type: 'disconnected', count: doomed.length }) : NONE;
}

/** Remove one cable by id — the cable overlay's click target. */
export function disconnectAt(id: number): Outcome {
  if (!useRackStore.getState().cables.some((c) => c.id === id)) return NONE;
  disconnectCable(id);
  return emit({ type: 'disconnected', count: 1 });
}

/* ---- pointer patching ---- */

export interface DragState {
  fixed: JackInfo;
  need: JackDir;
  x: number;
  y: number;
}

let drag: DragState | null = null;
export const getDrag = (): DragState | null => drag;

/** Grabbing a patched input pulls that cable and continues from its source.
    The outcome lands on pointerup, through subscribe(). */
export function beginDrag(info: JackInfo, e: PointerEvent): void {
  let fixed = info;
  let pulled = false;

  if (info.dir === 'in') {
    const existing = useRackStore
      .getState()
      .cables.find((c) => c.to.uid === info.uid && c.to.jack === info.def.id);
    if (existing) {
      const outInfo = getJack(jackKey(existing.from.uid, 'out', existing.from.jack));
      disconnectCable(existing.id);
      pulled = true;
      if (outInfo) fixed = outInfo;
    }
  }

  const need: JackDir = fixed.dir === 'out' ? 'in' : 'out';
  drag = { fixed, need, x: e.clientX, y: e.clientY };
  fixed.el.classList.add('hot');
  setCompat(need, true);

  const move = (ev: PointerEvent): void => {
    if (drag) {
      drag.x = ev.clientX;
      drag.y = ev.clientY;
    }
  };
  const cleanup = (): void => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', cancel);
    fixed.el.classList.remove('hot');
    setCompat(need, false);
    drag = null;
  };
  // A cancelled drag still leaves a pulled cable off its input.
  const cancel = (): void => {
    cleanup();
    if (pulled) emit({ type: 'disconnected', count: 1 });
  };
  const up = (ev: PointerEvent): void => {
    cleanup();
    const hitKey = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .map((node) => (node as HTMLElement).dataset?.jackKey)
      .find((k): k is string => Boolean(k));
    const target = hitKey ? getJack(hitKey) : undefined;
    if (target && target.dir === need && !(target.uid === fixed.uid && target.def.id === fixed.def.id)) {
      const from = fixed.dir === 'out' ? fixed : target;
      const to = fixed.dir === 'in' ? fixed : target;
      if (connectCable(ref(from), ref(to))) return void emit({ type: 'connected', from, to });
    }
    if (pulled) emit({ type: 'disconnected', count: 1 });
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cancel);
}
