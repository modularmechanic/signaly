import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'lpg',
  name: 'LPG',
  sub: 'VACTROL LOW PASS GATE',
  hp: 4,
  cat: 'FILTERS',
  look: 'atelier',
  worklet: 'lpg',
  knobs: [
    { id: 'level', label: 'LEVEL', min: 0, max: 1, initial: 0, fmt: 'fPc', big: true, cvIn: 'cv' },
    { id: 'resp', label: 'RESPONSE', min: 0.005, max: 2, initial: 0.15, fmt: 'fMs', curve: 'log' },
    { id: 'colour', label: 'COLOUR', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['LPG', 'VCA', 'VCF'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'CV', kind: 'c' },
    { id: 'ping', label: 'PING', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
