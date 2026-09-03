import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'ladder',
  name: 'LADDER',
  sub: '4-POLE TRANSISTOR',
  hp: 2,
  cat: 'FILTERS',
  worklet: 'ladder',
  dark: true,
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 25,
      max: 14000,
      initial: 1200,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.2, fmt: 'fPc', cvIn: 'rcv' },
    { id: 'drive', label: 'DRIVE', min: 0.3, max: 6, initial: 1, fmt: 'f1' },
    { id: 'cv', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    { id: 'rcvA', label: 'RES CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'rcv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
    { id: 'rcv', label: 'RES CV', kind: 'c' },
  ],
  outs: [{ id: 'lp', label: 'LP OUT', kind: 'a' }],
};
