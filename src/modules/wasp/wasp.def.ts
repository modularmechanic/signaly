import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'wasp',
  name: 'WASP',
  sub: 'CMOS MULTIMODE',
  hp: 4,
  cat: 'FILTERS',
  look: 'carbon',
  worklet: 'wasp',
  dark: true,
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 25,
      max: 15000,
      initial: 900,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.4, fmt: 'fPc' },
    { id: 'dirt', label: 'DIRT', min: 0, max: 1, initial: 0.4, fmt: 'fPc' },
    { id: 'cv', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
  ],
  outs: [
    { id: 'lp', label: 'LP', kind: 'a' },
    { id: 'bp', label: 'BP', kind: 'a' },
    { id: 'hp', label: 'HP', kind: 'a' },
  ],
};
