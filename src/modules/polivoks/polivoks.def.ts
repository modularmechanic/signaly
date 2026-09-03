import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'polivoks',
  name: 'POLIVOKS',
  sub: 'SOVIET OP-AMP FILTER',
  hp: 4,
  cat: 'FILTERS',
  look: 'grid',
  worklet: 'polivoks',
  dark: true,
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 25,
      max: 15000,
      initial: 1000,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'drive', label: 'DRIVE', min: 0.3, max: 8, initial: 1, fmt: 'f1' },
    { id: 'cvA', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
