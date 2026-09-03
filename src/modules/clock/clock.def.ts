import type { ModuleDef } from '../../core/types';

/** Out ids x1/x2/d2/d4 are historic: they name the DEFAULT rate of each output
    (×1/×2/÷2/÷4), not a fixed one — every output has its own rate knob. */
export const def: ModuleDef = {
  id: 'clock',
  name: 'CLOCK',
  sub: 'MASTER TEMPO',
  hp: 6,
  cat: 'SEQ / CTRL',
  worklet: 'clock',
  dark: true,
  knobs: [
    { id: 'bpm', label: 'BPM', min: 30, max: 300, initial: 120, fmt: 'fInt', big: true },
    { id: 'r1', label: 'OUT 1', min: 0, max: 6, initial: 3, fmt: 'fRate' },
    { id: 'r2', label: 'OUT 2', min: 0, max: 6, initial: 4, fmt: 'fRate' },
    { id: 'r3', label: 'OUT 3', min: 0, max: 6, initial: 2, fmt: 'fRate' },
    { id: 'r4', label: 'OUT 4', min: 0, max: 6, initial: 1, fmt: 'fRate' },
  ],
  sws: [{ id: 'run', label: 'RUN', options: ['STOP', 'RUN'] }],
  ins: [
    { id: 'rst', label: 'RESET', kind: 'g' },
    { id: 'ss', label: 'START/STOP', kind: 'g' },
  ],
  outs: [
    { id: 'x1', label: '1', kind: 'g' },
    { id: 'x2', label: '2', kind: 'g' },
    { id: 'd2', label: '3', kind: 'g' },
    { id: 'd4', label: '4', kind: 'g' },
    { id: 'rec', label: 'REC', kind: 'g' },
  ],
  display: 'text',
};
