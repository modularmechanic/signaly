import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'trigseq',
  name: 'TRIG SEQ',
  sub: '4 × 16 TRIGGER GRID',
  hp: 16,
  cat: 'SEQ / CTRL',
  look: 'console',
  worklet: 'trigseq',
  dark: true,
  knobs: [
    { id: 'len1', label: 'LEN 1', min: 1, max: 16, initial: 16, fmt: 'fInt' },
    { id: 'len2', label: 'LEN 2', min: 1, max: 16, initial: 16, fmt: 'fInt' },
    { id: 'len3', label: 'LEN 3', min: 1, max: 16, initial: 16, fmt: 'fInt' },
    { id: 'len4', label: 'LEN 4', min: 1, max: 16, initial: 16, fmt: 'fInt' },
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [
    { id: 't1', label: 'LANE 1', kind: 'g' },
    { id: 't2', label: 'LANE 2', kind: 'g' },
    { id: 't3', label: 'LANE 3', kind: 'g' },
    { id: 't4', label: 'LANE 4', kind: 'g' },
  ],
  display: 'steps',
};
