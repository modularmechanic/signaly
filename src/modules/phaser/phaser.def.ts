import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'phaser',
  name: 'PHASER',
  sub: 'ALL-PASS SWEEP',
  hp: 6,
  cat: 'FX',
  look: 'ether',
  worklet: 'phaser',
  knobs: [
    {
      id: 'rate',
      label: 'RATE',
      min: 0.02,
      max: 8,
      initial: 0.4,
      fmt: 'fHz',
      curve: 'log',
      big: true,
    },
    { id: 'depth', label: 'DEPTH', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
    {
      id: 'centre',
      label: 'CENTRE',
      min: 100,
      max: 5000,
      initial: 800,
      fmt: 'fHz',
      curve: 'log',
      cvIn: 'ccv',
    },
    { id: 'fb', label: 'FEEDBACK', min: -0.9, max: 0.9, initial: 0.4, fmt: 'f1' },
    { id: 'ccvA', label: 'CENTRE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'ccv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
  ],
  sws: [{ id: 'stages', label: 'STAGES', options: ['4', '6', '8'], initial: 1 }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'ccv', label: 'CENTRE CV', kind: 'c' },
    { id: 'sync', label: 'SYNC', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
