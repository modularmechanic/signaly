import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'saturate',
  name: 'SATURATE',
  sub: 'TAPE / CONSOLE',
  hp: 4,
  cat: 'FX',
  look: 'tape',
  worklet: 'saturate',
  dark: true,
  knobs: [
    {
      id: 'drive',
      label: 'DRIVE',
      min: 0.3,
      max: 6,
      initial: 1,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'dcv',
    },
    { id: 'bias', label: 'BIAS', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'tilt', label: 'TILT', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'dcvA', label: 'DRIVE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['TAPE', 'CONSOLE'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
