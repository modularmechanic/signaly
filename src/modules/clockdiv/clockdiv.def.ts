import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'clockdiv',
  name: 'CLOCK ÷N',
  sub: 'CLOCK DIVIDER',
  hp: 2,
  cat: 'SEQ / CTRL',
  worklet: 'clockdiv',
  dark: true,
  knobs: [{ id: 'div', label: 'DIVIDE', min: 1, max: 64, initial: 4, fmt: 'fInt', big: true }],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
  ],
  outs: [{ id: 'out', label: '÷ OUT', kind: 'g' }],
  leds: ['clk'],
};
