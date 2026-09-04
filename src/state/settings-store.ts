import { create } from 'zustand';
import { KEYS, readJson, writeJson } from '../storage/local-json';

export const MIN_ROW_HP = 120;
export const MAX_ROW_HP = 240;
export const DEFAULT_ROW_HP = 120;

export const MIN_ZOOM = 0.2;
/** A runaway guard, not a usable ceiling: at 1000x one knob spans dozens of screens, so zooming
    in is uncapped in every practical sense while the stored number can never run away. */
export const MAX_ZOOM = 1000;
export const DEFAULT_ZOOM = 1;

export interface Settings {
  /** row capacity in HP; rack.ts spills overflowing adds into a new row and refuses moves */
  rowWidthHp: number;
  /** user override on top of `prefers-reduced-motion` */
  reducedMotion: boolean;
  /** keys in `localStorage` instead of `sessionStorage`; see `api-key-store` for the migration */
  rememberKeys: boolean;
  /** rack magnification, applied as CSS `zoom` on the rack surface only — never the chrome */
  zoom: number;
}

/** Raw on purpose: only the presence of the envelope matters, and storage can be disabled. */
function hasPersistedKeys(): boolean {
  try {
    return localStorage.getItem(KEYS.apiKeys) !== null;
  } catch {
    return false;
  }
}

const clampHp = (v: number): number =>
  Number.isFinite(v) ? Math.min(MAX_ROW_HP, Math.max(MIN_ROW_HP, Math.round(v))) : DEFAULT_ROW_HP;

export const clampZoom = (v: number): number =>
  Number.isFinite(v) ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v)) : DEFAULT_ZOOM;

function load(): Settings {
  const s = readJson<Partial<Settings>>(KEYS.settings, {});
  return {
    rowWidthHp: clampHp(typeof s.rowWidthHp === 'number' ? s.rowWidthHp : DEFAULT_ROW_HP),
    reducedMotion: s.reducedMotion === true,
    // Session-only is the default for new users, but someone who already has a key in
    // localStorage chose persistence under the old rules: keep it and show them the checkbox.
    // Never `false` while a key is still on disk — that would hide it.
    rememberKeys: typeof s.rememberKeys === 'boolean' ? s.rememberKeys : hasPersistedKeys(),
    zoom: clampZoom(typeof s.zoom === 'number' ? s.zoom : DEFAULT_ZOOM),
  };
}

export interface SettingsState extends Settings {
  setRowWidthHp(v: number): void;
  setReducedMotion(v: boolean): void;
  /** Prefer `setRememberKeys` from `api-key-store`: it also moves the keys between stores. */
  setRememberKeys(v: boolean): void;
  setZoom(v: number): void;
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
  setRememberKeys: (v) => {
    set({ rememberKeys: v });
    persist(get());
  },
  setZoom: (v) => {
    set({ zoom: clampZoom(v) });
    persist(get());
  },
}));

function persist(s: Settings): void {
  writeJson<Settings>(KEYS.settings, {
    rowWidthHp: s.rowWidthHp,
    reducedMotion: s.reducedMotion,
    rememberKeys: s.rememberKeys,
    zoom: s.zoom,
  });
}
