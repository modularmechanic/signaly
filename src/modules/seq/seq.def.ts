import type { ModuleDef } from '../../core/types';
import { panel } from './seq.panel';

export const def: ModuleDef = {
  id: 'seq',
  name: 'SEQ-8',
  sub: 'STEP SEQUENCER',
  hp: 17,
  cat: 'SEQ / CTRL',
  worklet: 'seq',
  dark: true,
  knobs: [
    { id: 'len', label: 'STEPS', min: 1, max: 8, def: 8, fmt: 'fInt' },
    { id: 'glide', label: 'GLIDE', min: 0.001, max: 0.3, def: 0.01, fmt: 'fMs', curve: 'log' },
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
  panel,
};
