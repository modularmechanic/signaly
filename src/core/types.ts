export type Kind = 'a' | 'p' | 'g' | 'c';

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
  'fHz' | 'fMs' | 'fPc' | 'f1' | 'fSemi' | 'fInt' | 'fKey' | 'fChord' | 'fShape' | 'fRate';

export type Display = 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text';

export interface KnobDef {
  id: string;
  label: string;
  min: number;
  max: number;
  def: number;
  fmt?: FmtName;
  curve?: 'lin' | 'log';
  big?: boolean;
  fader?: boolean;
  /** input jack id whose patched CV modulates this knob (display hint) */
  cvIn?: string;
  /** input jack id this knob attenuverts (engine inserts a GainNode) */
  attenuates?: string;
}

export interface SwitchDef {
  id: string;
  label: string;
  options: string[];
  def?: number;
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
  display?: Display;
  /** authored by built-ins via `<id>.panel.ts`; optional for user modules */
  panel?: PanelLayout;
}

export const CAT_COLOR: Record<Cat, string> = {
  SOURCES: '#e05d3a',
  FILTERS: '#e0a53a',
  'ENV / FUNC': '#5aa876',
  'AMP / MIX': '#7d8794',
  FX: '#7a63c9',
  VOICES: '#c94f6d',
  'SEQ / CTRL': '#3f7fc4',
  DRUMS: '#d98e2b',
  METERS: '#3fb8b0',
  OUTPUT: '#2e3138',
  UTILITY: '#8a8f98',
  CUSTOM: '#d16bd1',
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

/** One HP in CSS pixels — must match `--hp` in styles/tokens.css. */
export const HP_PX = 15;
/** Panel height in CSS pixels — must match `--panel-h` in styles/tokens.css. */
export const PANEL_H = 380;
