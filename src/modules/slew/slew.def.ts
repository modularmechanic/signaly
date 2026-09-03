import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'slew',
  name: 'SLEW',
  sub: 'DUAL SLEW LIMITER',
  hp: 4,
  cat: 'ENV / FUNC',
  look: 'atelier',
  worklet: 'slew',
  knobs: [
    { id: 'r1', label: 'RISE 1', min: 0.001, max: 8, initial: 0.05, fmt: 'fMs', curve: 'log' },
    { id: 'f1', label: 'FALL 1', min: 0.001, max: 8, initial: 0.05, fmt: 'fMs', curve: 'log' },
    { id: 'r2', label: 'RISE 2', min: 0.001, max: 8, initial: 0.2, fmt: 'fMs', curve: 'log' },
    { id: 'f2', label: 'FALL 2', min: 0.001, max: 8, initial: 0.2, fmt: 'fMs', curve: 'log' },
  ],
  sws: [{ id: 'link', label: 'LINK', options: ['OFF', '1>2'] }],
  ins: [
    { id: 'in1', label: 'IN 1', kind: 'c' },
    { id: 'in2', label: 'IN 2', kind: 'c' },
  ],
  outs: [
    { id: 'out1', label: 'OUT 1', kind: 'c' },
    { id: 'out2', label: 'OUT 2', kind: 'c' },
  ],
};
