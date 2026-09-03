import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'comb',
  name: 'COMB',
  sub: 'TUNED COMB FILTER',
  hp: 2,
  cat: 'FILTERS',
  worklet: 'comb',
  knobs: [
    { id: 'freq', label: 'FREQ', min: 25, max: 4000, initial: 220, fmt: 'fHz', curve: 'log', big: true },
    { id: 'fb', label: 'FEEDBK', min: -0.99, max: 0.99, initial: 0.7, fmt: 'f1' },
    { id: 'damp', label: 'DAMP', min: 400, max: 16000, initial: 6000, fmt: 'fHz', curve: 'log' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'voct', label: 'V/OCT', kind: 'p' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
