import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'formant',
  name: 'VOWEL',
  sub: 'FORMANT FILTER',
  hp: 4,
  cat: 'FILTERS',
  look: 'atelier',
  worklet: 'formant',
  knobs: [
    {
      id: 'vowel',
      label: 'A·E·I·O·U',
      min: 0,
      max: 4,
      initial: 0,
      fmt: 'f1',
      curve: 'lin',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0.5, max: 0.98, initial: 0.85, fmt: 'fPc' },
    { id: 'cv', label: 'VOWEL CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'VOWEL CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
