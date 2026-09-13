import { att, type ModuleDef } from '../../core/types';

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
    att('bcv', 'BIAS CV', 'biasA'),
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
