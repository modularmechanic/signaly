import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'morph',
  name: 'MORPH',
  sub: 'SWEEPING MULTIMODE',
  hp: 4,
  cat: 'FILTERS',
  look: 'patina',
  worklet: 'morph',
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 30,
      max: 16000,
      initial: 1000,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.25, fmt: 'fPc' },
    { id: 'shape', label: 'SHAPE', min: 0, max: 1, initial: 0, fmt: 'fPc', cvIn: 'scv' },
    { id: 'shapeA', label: 'SHAPE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'scv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
    { id: 'scv', label: 'SHAPE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
