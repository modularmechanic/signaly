import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'turing',
  name: 'TURING',
  sub: 'LOOPING SHIFT REGISTER',
  hp: 8,
  cat: 'SEQ / CTRL',
  worklet: 'turing',
  dark: true,
  knobs: [
    { id: 'prob', label: 'PROBABILITY', min: 0, max: 1, initial: 1, fmt: 'fPc', big: true, cvIn: 'pcv' },
    { id: 'len', label: 'LENGTH', min: 2, max: 16, initial: 8, fmt: 'fInt' },
    { id: 'scale', label: 'SCALE', min: 0, max: 5, initial: 2, fmt: 'f1' },
    { id: 'offset', label: 'OFFSET', min: -5, max: 5, initial: 0, fmt: 'f1' },
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'pcv', label: 'PROB CV', kind: 'c' },
  ],
  outs: [
    { id: 'cv', label: 'CV', kind: 'c' },
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'inv', label: 'INVERT', kind: 'g' },
  ],
  leds: ['b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8'],
};
