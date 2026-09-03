import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'wavefold',
  name: 'WAVEFOLD',
  sub: 'BUCHLA FOLDER',
  hp: 4,
  cat: 'FX',
  worklet: 'wavefold',
  dark: true,
  knobs: [
    {
      id: 'fold',
      label: 'FOLD',
      min: 0.5,
      max: 12,
      initial: 1,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'fcv',
    },
    { id: 'sym', label: 'SYMMETRY', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'fcvA', label: 'FOLD CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'fcv', label: 'FOLD CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
