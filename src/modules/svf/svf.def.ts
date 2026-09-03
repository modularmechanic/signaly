import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'svf',
  name: 'SVF',
  sub: 'STATE VARIABLE',
  hp: 4,
  cat: 'FILTERS',
  look: 'slateware',
  worklet: 'svf',
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 30,
      max: 16000,
      initial: 800,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.25, fmt: 'fPc', cvIn: 'rcv' },
    { id: 'cv', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    { id: 'rcvamt', label: 'RES CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'rcv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
    { id: 'rcv', label: 'RES CV', kind: 'c' },
  ],
  outs: [
    { id: 'lp', label: 'LP', kind: 'a' },
    { id: 'bp', label: 'BP', kind: 'a' },
    { id: 'hp', label: 'HP', kind: 'a' },
  ],
};
