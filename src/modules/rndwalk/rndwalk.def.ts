import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'rndwalk',
  name: 'RANDOM WALK',
  sub: 'BROWNIAN CV',
  hp: 6,
  cat: 'SEQ / CTRL',
  look: 'patina',
  worklet: 'rndwalk',
  dark: true,
  knobs: [
    { id: 'step', label: 'STEP', min: 0.01, max: 2, initial: 0.5, fmt: 'f1', big: true },
    { id: 'range', label: 'RANGE', min: 0.1, max: 5, initial: 5, fmt: 'f1' },
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'CV OUT', kind: 'c' }],
};
