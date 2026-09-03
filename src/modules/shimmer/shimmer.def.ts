import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'shimmer',
  name: 'SHIMMER',
  sub: 'OCTAVE-UP FEEDBACK VERB',
  hp: 8,
  cat: 'FX',
  look: 'ether',
  worklet: 'shimmer',
  knobs: [
    { id: 'fb', label: 'FEEDBACK', min: 0, max: 0.97, initial: 0.55, fmt: 'fPc', big: true, cvIn: 'fcv' },
    { id: 'window', label: 'WINDOW', min: 0.02, max: 0.2, initial: 0.08, fmt: 'fMs', curve: 'log' },
    { id: 'damp', label: 'DAMP', min: 500, max: 16000, initial: 5000, fmt: 'fHz', curve: 'log' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.35, fmt: 'fPc' },
    { id: 'fcvA', label: 'FB CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'fcv', label: 'FB CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'OUT L', kind: 'a' },
    { id: 'r', label: 'OUT R', kind: 'a' },
  ],
};
