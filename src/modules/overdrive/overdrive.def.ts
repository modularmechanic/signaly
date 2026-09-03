import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'overdrive',
  name: 'OVERDRIVE',
  sub: 'OP-AMP CLIPPER + TONE',
  hp: 6,
  cat: 'FX',
  look: 'anodic',
  worklet: 'overdrive',
  dark: true,
  knobs: [
    {
      id: 'drive',
      label: 'DRIVE',
      min: 0.3,
      max: 12,
      initial: 2,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'dcv',
    },
    { id: 'tone', label: 'TONE', min: 0, max: 1, initial: 0.5, fmt: 'fPc', cvIn: 'tocv' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'dcvA', label: 'DRIVE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
    { id: 'tocvA', label: 'TONE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'tocv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
    { id: 'tocv', label: 'TONE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
