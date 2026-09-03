import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'bern',
  name: 'BERNOULLI',
  sub: 'WEIGHTED COIN GATE',
  hp: 4,
  cat: 'SEQ / CTRL',
  look: 'chalk',
  worklet: 'bern',
  dark: true,
  knobs: [
    { id: 'bias', label: 'BIAS', min: 0, max: 1, initial: 0.5, fmt: 'fPc', big: true, cvIn: 'bcv' },
    { id: 'biasA', label: 'BIAS CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'bcv' },
  ],
  ins: [
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'bcv', label: 'BIAS CV', kind: 'c' },
  ],
  outs: [
    { id: 'a', label: 'A', kind: 'g' },
    { id: 'b', label: 'B', kind: 'g' },
  ],
};
