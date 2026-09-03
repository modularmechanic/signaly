import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'chaos',
  name: 'CHAOS',
  sub: 'STRANGE ATTRACTOR',
  hp: 4,
  cat: 'SOURCES',
  worklet: 'chaos',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.01, max: 40, initial: 2, fmt: 'fHz', curve: 'log', big: true },
    { id: 'strange', label: 'STRANGE', min: 0, max: 1, initial: 0.25, fmt: 'fPc' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1, initial: 0.8, fmt: 'fPc' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['LORENZ', 'LOGISTIC'] }],
  ins: [{ id: 'rcv', label: 'RATE CV', kind: 'c' }],
  outs: [
    { id: 'x', label: 'X', kind: 'c' },
    { id: 'y', label: 'Y', kind: 'c' },
    { id: 'z', label: 'Z', kind: 'c' },
  ],
};
