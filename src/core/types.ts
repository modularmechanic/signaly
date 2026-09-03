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
  'fHz' | 'fMs' | 'fPc' | 'f1' | 'fSemi' | 'fInt' | 'fKey' | 'fChord' | 'fShape' | 'fRate';

export type Display = 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text';

export interface KnobDef {
  id: string;
  label: string;
  min: number;
  max: number;
  initial: number;
  fmt?: FmtName;
  curve?: 'lin' | 'log';
  big?: boolean;
  fader?: boolean;
  /** input jack id whose patched CV modulates this knob (display hint) */
  cvIn?: string;
  /** input jack id this knob attenuverts (engine inserts a GainNode) */
  attenuates?: string;
  /** overrides ModuleDef.look.knob for this one control (a trimmer among Davies knobs) */
  look?: KnobLook;
}

export interface SwitchDef {
  id: string;
  label: string;
  options: string[];
  initial?: number;
  /** overrides ModuleDef.look.sw for this one control */
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
  display?: Display;
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

/** One HP in CSS pixels — must match `--hp` in styles/tokens.css. */
export const HP_PX = 26;
/** Panel height in CSS pixels — must match `--panel-h` in styles/tokens.css. */
export const PANEL_H = 658;
