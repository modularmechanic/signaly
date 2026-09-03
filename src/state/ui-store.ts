import { create } from 'zustand';

export type View = 'rack' | 'builder';

export interface UiState {
  view: View;
  browserOpen: boolean;
  selectedUid: number | null;
  settingsOpen: boolean;
  /** transient status line (also the aria-live region's text) */
  notice: string | null;
  setView(v: View): void;
  setBrowserOpen(open: boolean): void;
  setSelectedUid(uid: number | null): void;
  setSettingsOpen(open: boolean): void;
  setNotice(text: string | null): void;
}

export const useUiStore = create<UiState>((set) => ({
  view: 'rack',
  browserOpen: false,
  selectedUid: null,
  settingsOpen: false,
  notice: null,
  setView: (view) => set({ view }),
  setBrowserOpen: (browserOpen) => set({ browserOpen }),
  setSelectedUid: (selectedUid) => set({ selectedUid }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setNotice: (notice) => set({ notice }),
}));
