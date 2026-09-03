import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'rectify',
  name: 'RECTIFY',
  sub: 'HALF / FULL WAVE',
  hp: 4,
  cat: 'FX',
  look: 'lab',
  worklet: 'rectify',
  dark: true,
  knobs: [
    {
      id: 'drive',
      label: 'DRIVE',
      min: 0.5,
      max: 10,
      initial: 1,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'dcv',
    },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
    { id: 'dcvA', label: 'DRIVE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['HALF', 'FULL'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
