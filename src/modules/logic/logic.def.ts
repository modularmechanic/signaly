import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'logic',
  name: 'LOGIC',
  sub: 'BOOLEAN GATES',
  hp: 4,
  cat: 'ENV / FUNC',
  look: 'board',
  worklet: 'logic',
  knobs: [{ id: 'thr', label: 'THRESHOLD', min: 0.1, max: 5, initial: 2.5, fmt: 'f1', big: true }],
  ins: [
    { id: 'a', label: 'A', kind: 'g' },
    { id: 'b', label: 'B', kind: 'g' },
  ],
  outs: [
    { id: 'and', label: 'AND', kind: 'g' },
    { id: 'or', label: 'OR', kind: 'g' },
    { id: 'xor', label: 'XOR', kind: 'g' },
    { id: 'nota', label: 'NOT A', kind: 'g' },
  ],
  leds: ['a', 'b'],
};
