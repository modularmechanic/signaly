import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'diode',
  name: 'DIODE',
  sub: '4-POLE DIODE LADDER',
  hp: 4,
  cat: 'FILTERS',
  look: 'bronze',
  worklet: 'diode',
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
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.3, fmt: 'fPc', cvIn: 'rcv' },
    { id: 'cvA', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    { id: 'drive', label: 'DRIVE', min: 0.3, max: 8, initial: 1, fmt: 'f1' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
    { id: 'rcv', label: 'RES CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
