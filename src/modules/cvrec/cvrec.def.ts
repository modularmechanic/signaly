import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'cvrec',
  name: 'CV REC',
  sub: 'RECORD AND LOOP A CV',
  hp: 8,
  cat: 'SEQ / CTRL',
  look: 'tape',
  worklet: 'cvrec',
  dark: true,
  knobs: [{ id: 'bars', label: 'LENGTH', min: 1, max: 16, initial: 4, fmt: 'fInt', big: true }],
  sws: [{ id: 'rec', label: 'REC', options: ['PLAY', 'REC'] }],
  ins: [
    { id: 'in', label: 'CV IN', kind: 'c' },
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'CV OUT', kind: 'c' }],
  display: 'text',
};
