import { create } from 'zustand';
import { KEYS, readJson, writeJson } from '../storage/local-json';

export const MIN_ROW_HP = 120;
export const MAX_ROW_HP = 240;
export const DEFAULT_ROW_HP = 120;

export interface Settings {
  /** row capacity in HP; rack.ts spills overflowing adds into a new row and refuses moves */
  rowWidthHp: number;
  /** user override on top of `prefers-reduced-motion` */
  reducedMotion: boolean;
}

const clampHp = (v: number): number =>
  Number.isFinite(v) ? Math.min(MAX_ROW_HP, Math.max(MIN_ROW_HP, Math.round(v))) : DEFAULT_ROW_HP;

function load(): Settings {
  const s = readJson<Partial<Settings>>(KEYS.settings, {});
  return {
    rowWidthHp: clampHp(typeof s.rowWidthHp === 'number' ? s.rowWidthHp : DEFAULT_ROW_HP),
    reducedMotion: s.reducedMotion === true,
  };
}

export interface SettingsState extends Settings {
  setRowWidthHp(v: number): void;
  setReducedMotion(v: boolean): void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...load(),
  setRowWidthHp: (v) => {
    set({ rowWidthHp: clampHp(v) });
    persist(get());
  },
  setReducedMotion: (v) => {
    set({ reducedMotion: v });
    persist(get());
  },
}));

function persist(s: Settings): void {
  writeJson<Settings>(KEYS.settings, { rowWidthHp: s.rowWidthHp, reducedMotion: s.reducedMotion });
}
