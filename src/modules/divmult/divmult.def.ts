import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'divmult',
  name: 'DIV / MULT',
  sub: 'SIX CLOCK RATIOS',
  hp: 6,
  cat: 'SEQ / CTRL',
  look: 'anodic',
  worklet: 'divmult',
  dark: true,
  knobs: [],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [
    { id: 'd8', label: '÷8', kind: 'g' },
    { id: 'd4', label: '÷4', kind: 'g' },
    { id: 'd2', label: '÷2', kind: 'g' },
    { id: 'm2', label: '×2', kind: 'g' },
    { id: 'm3', label: '×3', kind: 'g' },
    { id: 'm4', label: '×4', kind: 'g' },
  ],
};
