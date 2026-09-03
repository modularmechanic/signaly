import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'lofi',
  name: 'LO-FI',
  sub: 'HISS · WOW · CRACKLE',
  hp: 6,
  cat: 'FX',
  look: 'tape',
  worklet: 'lofi',
  knobs: [
    {
      id: 'bw',
      label: 'BANDWIDTH',
      min: 300,
      max: 18000,
      initial: 8000,
      fmt: 'fHz',
      curve: 'log',
      big: true,
    },
    { id: 'wow', label: 'WOW', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'hiss', label: 'HISS', min: 0, max: 1, initial: 0.05, fmt: 'fPc' },
    { id: 'crackle', label: 'CRACKLE', min: 0, max: 1, initial: 0.1, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  ins: [{ id: 'in', label: 'IN', kind: 'a' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
