import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'seq16',
  name: 'SEQ-16',
  sub: '16-STEP CV / GATE',
  hp: 16,
  cat: 'SEQ / CTRL',
  look: 'stage',
  worklet: 'seq16',
  dark: true,
  knobs: [
    { id: 'len', label: 'STEPS', min: 1, max: 16, initial: 16, fmt: 'fInt' },
    { id: 'glide', label: 'GLIDE', min: 0.001, max: 0.3, initial: 0.01, fmt: 'fMs', curve: 'log' },
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [
    { id: 'cv', label: 'CV OUT', kind: 'p' },
    { id: 'gate', label: 'GATE', kind: 'g' },
  ],
  display: 'steps',
};
