import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'atn',
  name: 'DUAL ATN',
  sub: 'ATTENUVERT + OFFSET',
  hp: 4,
  cat: 'ENV / FUNC',
  worklet: 'atn',
  knobs: [
    { id: 'a1', label: 'ATT 1', min: -1, max: 1, initial: 1, fmt: 'f1' },
    { id: 'o1', label: 'OFF 1', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'a2', label: 'ATT 2', min: -1, max: 1, initial: 1, fmt: 'f1' },
    { id: 'o2', label: 'OFF 2', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'in1A', label: 'IN 1', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'in1' },
    { id: 'in2A', label: 'IN 2', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'in2' },
  ],
  ins: [
    { id: 'in1', label: 'IN 1', kind: 'c' },
    { id: 'in2', label: 'IN 2', kind: 'c' },
  ],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'c' },
    { id: 'o2', label: 'OUT 2', kind: 'c' },
  ],
};
