import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'dualbp',
  name: 'DUAL BP',
  sub: 'TWO BANDPASS · SPREAD',
  hp: 6,
  cat: 'FILTERS',
  look: 'ether',
  worklet: 'dualbp',
  knobs: [
    {
      id: 'freq',
      label: 'FREQ',
      min: 30,
      max: 6000,
      initial: 300,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'spread', label: 'SPREAD', min: 0, max: 36, initial: 24, fmt: 'fSemi' },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'cvA', label: 'FREQ CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
