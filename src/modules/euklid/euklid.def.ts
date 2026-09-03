import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'euklid',
  name: 'EUKLID',
  sub: 'RANDOM EUCLIDEAN GEN',
  hp: 10,
  cat: 'SEQ / CTRL',
  worklet: 'euklid',
  dark: true,
  knobs: [
    { id: 'steps', label: 'STEPS', min: 1, max: 16, initial: 16, fmt: 'fInt', big: true },
    { id: 'fill', label: 'FILL', min: 0, max: 16, initial: 5, fmt: 'fInt', cvIn: 'fill' },
    { id: 'rot', label: 'ROTATE', min: 0, max: 15, initial: 0, fmt: 'fInt' },
    { id: 'prob', label: 'PROB', min: 0, max: 1, initial: 1, fmt: 'fPc', cvIn: 'prob' },
    { id: 'chaos', label: 'CHAOS', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'fillA', label: 'FILL CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fill' },
    { id: 'probA', label: 'PROB CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'prob' },
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
    { id: 'fill', label: 'FILL CV', kind: 'c' },
    { id: 'prob', label: 'PROB CV', kind: 'c' },
  ],
  outs: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'inv', label: 'NOT', kind: 'g' },
    { id: 'acc', label: 'ACCENT', kind: 'g' },
  ],
  display: 'steps',
};
