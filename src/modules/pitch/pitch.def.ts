import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'pitch',
  name: 'PITCH',
  sub: 'SHIFTER / HARMONIZER',
  hp: 8,
  cat: 'FX',
  look: 'press',
  worklet: 'pitch',
  knobs: [
    {
      id: 'shift1',
      label: 'SHIFT 1',
      min: -24,
      max: 24,
      initial: 0,
      fmt: 'fSemi',
      big: true,
      cvIn: 'scv',
    },
    { id: 'shift2', label: 'SHIFT 2', min: -24, max: 24, initial: 7, fmt: 'fSemi' },
    { id: 'scvA', label: 'SHIFT CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'scv' },
    { id: 'window', label: 'WINDOW', min: 20, max: 200, initial: 60, fmt: 'fMs', curve: 'log' },
    { id: 'fb', label: 'FEEDBACK', min: -0.9, max: 0.9, initial: 0, fmt: 'f1' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'scv', label: 'SHIFT CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
