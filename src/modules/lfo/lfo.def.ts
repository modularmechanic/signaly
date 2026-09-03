import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'lfo',
  name: 'LFO',
  sub: 'MOD SOURCE',
  hp: 4,
  cat: 'SOURCES',
  worklet: 'lfo',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.02, max: 30, initial: 2, fmt: 'fHz', curve: 'log', cvIn: 'rate' },
    { id: 'rateA', label: 'RATE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'rate' },
  ],
  ins: [
    { id: 'rate', label: 'RATE CV', kind: 'c' },
    { id: 'rst', label: 'RESET', kind: 'g' },
    { id: 'clk', label: 'CLOCK', kind: 'g' },
  ],
  outs: [
    { id: 'sin', label: 'SIN', kind: 'c' },
    { id: 'tri', label: 'TRI', kind: 'c' },
    { id: 'saw', label: 'SAW', kind: 'c' },
    { id: 'sqr', label: 'SQR', kind: 'c' },
    { id: 'sh', label: 'S+H', kind: 'c' },
  ],
  leds: ['clk'],
};
