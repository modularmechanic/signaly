import type { Kind } from '../core/types';
import { connectCable, disconnectCable } from '../engine/rack';
import { useRackStore } from '../state/rack-store';

export type JackDir = 'in' | 'out';

export interface JackInfo {
  uid: number;
  jackId: string;
  dir: JackDir;
  kind: Kind;
  /** the `.jack` element — hit-testing, centres, hot/compat classes */
  el: HTMLElement;
  /** cached screen centre; cleared by invalidateJackRects() */
  c?: { x: number; y: number };
}

/** Registry key: unique per module instance + direction + jack id. */
export const jackKey = (uid: number, dir: JackDir, jackId: string): string => `${uid}:${dir}:${jackId}`;

const registry = new Map<string, JackInfo>();

export function registerJack(info: JackInfo): void {
  info.c = undefined;
  registry.set(jackKey(info.uid, info.dir, info.jackId), info);
}

export function unregisterJack(uid: number, dir: JackDir, jackId: string): void {
  registry.delete(jackKey(uid, dir, jackId));
}

export function getJack(key: string): JackInfo | undefined {
  return registry.get(key);
}

export function allJacks(): IterableIterator<JackInfo> {
  return registry.values();
}

/** Screen-space centre, measured once and cached — getBoundingClientRect per jack per frame
    is the cable overlay's whole frame budget. */
export function jackCenter(info: JackInfo): { x: number; y: number } {
  if (!info.c) {
    const r = info.el.getBoundingClientRect();
    info.c = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  return info.c;
}

/** Call on scroll / resize / rack layout change. */
export function invalidateJackRects(): void {
  for (const info of registry.values()) info.c = undefined;
}

export interface DragState {
  fixed: JackInfo;
  need: JackDir;
  kind: Kind;
  x: number;
  y: number;
}

let drag: DragState | null = null;
export const getDrag = (): DragState | null => drag;

/** Toggle the `.compat` glow on every jack that could accept the current drag/arm. */
function setCompat(need: JackDir, on: boolean): void {
  for (const info of registry.values()) if (info.dir === need) info.el.classList.toggle('compat', on);
}

/** Pull every cable off a jack. Inputs hold at most one; an output may fan out to many.
    Returns how many were removed so the caller can stay silent when there was nothing to pull. */
export function unpatchJack(uid: number, dir: JackDir, jackId: string): number {
  const end = dir === 'in' ? ('to' as const) : ('from' as const);
  const doomed = useRackStore.getState().cables.filter((c) => c[end].uid === uid && c[end].jack === jackId);
  doomed.forEach((c) => disconnectCable(c.id));
  return doomed.length;
}

/* ---- keyboard patching: arm a jack, then arm its partner ---- */

export interface ArmedJack {
  uid: number;
  dir: JackDir;
  jackId: string;
}

let armed: ArmedJack | null = null;
const armListeners = new Set<(a: ArmedJack | null) => void>();

export const getArmed = (): ArmedJack | null => armed;

export function subscribeArm(fn: (a: ArmedJack | null) => void): () => void {
  armListeners.add(fn);
  return () => {
    armListeners.delete(fn);
  };
}

function setArmed(a: ArmedJack | null): void {
  if (armed) setCompat(armed.dir === 'out' ? 'in' : 'out', false);
  armed = a;
  if (a) setCompat(a.dir === 'out' ? 'in' : 'out', true);
  for (const fn of armListeners) fn(armed);
}

export function cancelArm(): void {
  setArmed(null);
}

/** Arm a jack, or — when a jack of the opposite direction is already armed — patch the pair. */
export function armJack(uid: number, dir: JackDir, jackId: string): void {
  if (armed && armed.dir !== dir) {
    const out = dir === 'out' ? { uid, jackId } : { uid: armed.uid, jackId: armed.jackId };
    const inp = dir === 'in' ? { uid, jackId } : { uid: armed.uid, jackId: armed.jackId };
    setArmed(null);
    connectCable({ uid: out.uid, jack: out.jackId }, { uid: inp.uid, jack: inp.jackId });
    return;
  }
  if (armed && armed.uid === uid && armed.jackId === jackId) return cancelArm();
  setArmed({ uid, dir, jackId });
}

/** Pointer drag. Grabbing a patched input pulls that cable and continues from its source. */
export function startJackDrag(info: JackInfo, e: PointerEvent): void {
  let fixed = info;
  let kind = info.kind;

  if (info.dir === 'in') {
    const existing = useRackStore
      .getState()
      .cables.find((c) => c.to.uid === info.uid && c.to.jack === info.jackId);
    if (existing) {
      const outInfo = getJack(jackKey(existing.from.uid, 'out', existing.from.jack));
      disconnectCable(existing.id);
      if (outInfo) {
        fixed = outInfo;
        kind = outInfo.kind;
      }
    }
  }

  const need: JackDir = fixed.dir === 'out' ? 'in' : 'out';
  drag = { fixed, need, kind, x: e.clientX, y: e.clientY };
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
    window.removeEventListener('pointercancel', cleanup);
    fixed.el.classList.remove('hot');
    setCompat(need, false);
    drag = null;
  };
  const up = (ev: PointerEvent): void => {
    cleanup();
    const hitKey = document
      .elementsFromPoint(ev.clientX, ev.clientY)
      .map((node) => (node as HTMLElement).dataset?.jackKey)
      .find((k): k is string => Boolean(k));
    const target = hitKey ? getJack(hitKey) : undefined;
    if (target && target.dir === need && !(target.uid === fixed.uid && target.jackId === fixed.jackId)) {
      const out = fixed.dir === 'out' ? fixed : target;
      const inp = fixed.dir === 'in' ? fixed : target;
      connectCable({ uid: out.uid, jack: out.jackId }, { uid: inp.uid, jack: inp.jackId });
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', cleanup);
}

/** Slop in px: a press that travels further than this was a drag, not a click. */
export const CLICK_SLOP = 4;

export interface Press {
  /** the press began on a knob, fader, switch or jack */
  onControl: boolean;
  /** distance in px between pointerdown and pointerup */
  travel: number;
}

/** Whether the click ending this press should remove the cable under the cursor.

    A click that began on a control is the end of that control's drag, not a click on a cable:
    the knob captures the pointer, so the click is retargeted to the knob and bubbles to the
    window with whatever cable the cursor happens to have wandered over. Turning a knob and
    letting go over a cable used to delete it. A press that travelled is a drag for the same
    reason, whether or not it started on a control. */
export const clickRemovesCable = (p: Press): boolean => !p.onControl && p.travel <= CLICK_SLOP;
