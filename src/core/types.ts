import type { Kit, KnobLook, SwitchLook } from './look';

export type Kind = 'a' | 'p' | 'g' | 'c';

/** Canonical display name per signal kind — jack aria-labels and the module-builder prompt. */
export const KIND_NAME: Record<Kind, string> = { a: 'audio', p: 'pitch', g: 'gate', c: 'CV' };

export type Cat =
  | 'SOURCES'
  | 'FILTERS'
  | 'ENV / FUNC'
  | 'AMP / MIX'
  | 'FX'
  | 'VOICES'
  | 'SEQ / CTRL'
  | 'DRUMS'
  | 'METERS'
  | 'OUTPUT'
  | 'UTILITY'
  | 'CUSTOM';

export type FmtName =
  | 'fHz'
  | 'fMs'
  | 'fMsec'
  | 'fPc'
  | 'f1'
  | 'fSemi'
  | 'fInt'
  | 'fKey'
  | 'fChord'
  | 'fShape'
  | 'fRate';

export type Display = 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text';

/** The range each fmt implies, as bounds a knob's [min,max] must stay inside. fmt is not
    cosmetic: fPc renders v*100, fMs reads the value as SECONDS and fMsec as MILLISECONDS, fHz as
    signed hertz, and fKey/fChord/
    fShape/fRate index a fixed list of labels and clamp out-of-range values silently. Names
    absent here — f1, fSemi, fInt — bound nothing. checkDef holds every knob to this, so an
    entry here must match the matching formatter in hooks/formatters.ts. */
export const FMT_RANGE: Partial<Record<FmtName, readonly [number, number]>> = {
  // Signed: a frequency shift is legitimately negative. The bound is Nyquist either way.
  fHz: [-22050, 22050],
  fMs: [0, 60],
  fMsec: [0, 60000],
  fPc: [0, 2],
  fKey: [0, 11],
  fChord: [0, 11],
  fShape: [0, 3],
  fRate: [0, 6],
};

export interface KnobDef {
  id: string;
  label: string;
  min: number;
  max: number;
  initial: number;
  fmt: FmtName;
  curve?: 'lin' | 'log';
  big?: boolean;
  fader?: boolean;
  /** input jack id whose patched CV modulates this knob (display hint) */
  cvIn?: string;
  /** input jack id this knob attenuverts (engine inserts a GainNode) */
  attenuates?: string;
  /** overrides the module kit's knob style for this one control (a trimmer among Davies knobs) */
  look?: KnobLook;
}

/** The bipolar attenuverter for CV input `jack`. The engine reads this knob as a gain on that
    input (KnobDef.attenuates), never as a DSP param — so the range is fixed, the DSP must not
    scale the input, and a jack may carry at most one. The knob it modulates, if any, names the
    same jack in `cvIn`. Declaring the four numbers by hand is the mistake this exists to stop. */
export const att = (jack: string, label: string, id = `${jack}A`): KnobDef => ({
  id,
  label,
  min: -1,
  max: 1,
  initial: 0,
  fmt: 'f1',
  attenuates: jack,
});

export interface SwitchDef {
  id: string;
  label: string;
  options: string[];
  initial?: number;
  /** overrides the module kit's switch style for this one control */
  look?: SwitchLook;
}

export interface JackDef {
  id: string;
  label: string;
  kind: Kind;
}

export type PanelNodeKind = 'knob' | 'fader' | 'switch' | 'led' | 'in' | 'out' | 'display' | 'label';

/** Normalised 0..1 panel geometry. */
export interface PanelNode {
  id: string;
  kind: PanelNodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface PanelLayout {
  nodes: PanelNode[];
}

export interface ModuleDef {
  id: string;
  name: string;
  sub: string;
  hp: number;
  cat: Cat;
  dark?: boolean;
  /** exactly one of worklet / native */
  worklet?: string;
  native?: string;
  knobs: KnobDef[];
  sws?: SwitchDef[];
  ins: JackDef[];
  outs: JackDef[];
  /** which renderer fills the screen — see modules/display-contract.ts for what each needs */
  display?: Display;
  /** reserve the screen box without naming a renderer: the module's `.parts.tsx` fills it */
  screen?: boolean;
  /** ids lit by a `{ t: 'led', id, v }` worklet feed; laid out as `led:<id>` panel nodes */
  leds?: string[];
  /** optional authored geometry (user modules); built-ins use the computed layout */
  panel?: PanelLayout;
  /** visual identity; falls back to CAT_KIT[cat]. See src/core/look.ts. */
  look?: Kit;
}

export const CAT_COLOR: Record<Cat, string> = {
  SOURCES: '#ff6a3d',
  FILTERS: '#ffc247',
  'ENV / FUNC': '#4ade80',
  'AMP / MIX': '#c8b48a',
  FX: '#a78bfa',
  VOICES: '#ff5c8a',
  'SEQ / CTRL': '#5aa9ff',
  DRUMS: '#ff9a3d',
  METERS: '#2dd4bf',
  OUTPUT: '#e5e7eb',
  UTILITY: '#b0b6c0',
  CUSTOM: '#e879f9',
};

export const CAT_ORDER: readonly Cat[] = [
  'SOURCES',
  'FILTERS',
  'ENV / FUNC',
  'AMP / MIX',
  'FX',
  'VOICES',
  'SEQ / CTRL',
  'DRUMS',
  'METERS',
  'OUTPUT',
  'UTILITY',
  'CUSTOM',
];
