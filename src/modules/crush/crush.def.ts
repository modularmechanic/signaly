import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'crush',
  name: 'CRUSH',
  sub: 'BIT / RATE REDUCE',
  hp: 6,
  cat: 'FX',
  worklet: 'crush',
  dark: true,
  knobs: [
    { id: 'bits', label: 'BITS', min: 1, max: 16, initial: 8, fmt: 'fInt', cvIn: 'bcv' },
    { id: 'rate', label: 'DECIM', min: 1, max: 64, initial: 4, fmt: 'fInt', curve: 'log', cvIn: 'rcv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc', cvIn: 'mcv' },
    { id: 'bcvA', label: 'BITS CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'bcv' },
    { id: 'rcvA', label: 'RATE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'rcv' },
    { id: 'mcvA', label: 'MIX CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'mcv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'bcv', label: 'BITS CV', kind: 'c' },
    { id: 'rcv', label: 'RATE CV', kind: 'c' },
    { id: 'mcv', label: 'MIX CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
