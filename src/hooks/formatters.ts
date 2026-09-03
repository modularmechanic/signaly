import type { FmtName } from '../core/types';

const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);
const pick = (arr: readonly string[], i: number): string => arr[clamp(i, 0, arr.length - 1)] ?? '';

const KEYN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHN = ['MAJ', 'MIN', 'MAJ7', 'MIN7', 'DOM7', 'SUS4', 'DIM7', 'AUG', '5TH', 'MAJ SC', 'MIN SC', 'PENTA'];
const SHN = ['UP', 'DOWN', 'UP-DN', 'RANDOM'];
// Clock per-output multiply/divide options; index 3 = x1.
const RATEN = ['/8', '/4', '/2', 'x1', 'x2', 'x4', 'x8'];

export const FMT: Record<FmtName, (v: number) => string> = {
  fHz: (v) =>
    v >= 1000 ? (v / 1000).toFixed(2) + ' kHz' : v >= 100 ? v.toFixed(0) + ' Hz' : v.toFixed(1) + ' Hz',
  fMs: (v) => (v >= 1 ? v.toFixed(2) + ' s' : (v * 1000).toFixed(0) + ' ms'),
  fPc: (v) => (v * 100).toFixed(0) + ' %',
  f1: (v) => v.toFixed(2),
  fSemi: (v) => (v > 0 ? '+' : '') + v.toFixed(1) + ' st',
  fInt: (v) => Math.round(v).toString(),
  fKey: (v) => pick(KEYN, ((Math.round(v) % 12) + 12) % 12),
  fChord: (v) => pick(CHN, Math.round(v)),
  fShape: (v) => pick(SHN, Math.round(v)),
  fRate: (v) => pick(RATEN, Math.round(v)),
};

export const fmtValue = (name: FmtName | undefined, v: number): string => FMT[name ?? 'f1'](v);

/** Integer-stepped knobs (rounded while dragging). */
const INT_FMT = new Set<FmtName>(['fInt', 'fRate', 'fKey', 'fChord', 'fShape']);
export const isIntFmt = (name: FmtName | undefined): boolean => name !== undefined && INT_FMT.has(name);
