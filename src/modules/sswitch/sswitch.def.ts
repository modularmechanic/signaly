import type { ModuleDef } from '../../core/types';

// `switch` is a reserved word, so the id is `sswitch`.
export const def: ModuleDef = {
  id: 'sswitch',
  name: 'SWITCH',
  sub: 'SEQUENTIAL ROUTER',
  hp: 4,
  cat: 'SEQ / CTRL',
  worklet: 'sswitch',
  dark: true,
  knobs: [{ id: 'steps', label: 'STEPS', min: 2, max: 4, initial: 4, fmt: 'fInt', big: true }],
  sws: [{ id: 'dir', label: 'DIRECTION', options: ['1→4', '4→1'] }],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'rst', label: 'RESET', kind: 'g' },
    { id: 'in1', label: 'IN 1', kind: 'a' },
    { id: 'in2', label: 'IN 2', kind: 'a' },
    { id: 'in3', label: 'IN 3', kind: 'a' },
    { id: 'in4', label: 'IN 4', kind: 'a' },
  ],
  outs: [
    { id: 'out1', label: 'OUT 1', kind: 'a' },
    { id: 'out2', label: 'OUT 2', kind: 'a' },
    { id: 'out3', label: 'OUT 3', kind: 'a' },
    { id: 'out4', label: 'OUT 4', kind: 'a' },
  ],
  leds: ['s1', 's2', 's3', 's4'],
};
