import type { JackDef } from '../core/types';

export type JackDir = 'in' | 'out';

export interface JackInfo {
  uid: number;
  dir: JackDir;
  def: JackDef;
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
  registry.set(jackKey(info.uid, info.dir, info.def.id), info);
}

export function unregisterJack(uid: number, dir: JackDir, jackId: string): void {
  registry.delete(jackKey(uid, dir, jackId));
}

export function getJack(key: string): JackInfo | undefined {
  return registry.get(key);
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

/** Toggle the `.compat` glow on every jack that could accept the current drag/arm. */
export function setCompat(need: JackDir, on: boolean): void {
  for (const info of registry.values()) if (info.dir === need) info.el.classList.toggle('compat', on);
}
