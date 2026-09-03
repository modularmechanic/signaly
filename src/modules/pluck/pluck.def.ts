import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'pluck',
  name: 'PLUCK',
  sub: 'KARPLUS-STRONG',
  hp: 6,
  cat: 'VOICES',
  worklet: 'pluck',
  knobs: [
    {
      id: 'tune',
      label: 'TUNE',
      min: 40,
      max: 1500,
      initial: 220,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'tcv',
    },
    { id: 'damp', label: 'DAMP', min: 200, max: 16000, initial: 3500, fmt: 'fHz', curve: 'log' },
    { id: 'bright', label: 'BRIGHT', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
    { id: 'dec', label: 'DECAY', min: 0.05, max: 8, initial: 1.2, fmt: 'fMs', curve: 'log' },
    { id: 'tcvA', label: 'TUNE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'tcv' },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'tcv', label: 'TUNE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
