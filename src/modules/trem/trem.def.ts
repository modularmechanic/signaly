import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'trem',
  name: 'TREMOLO',
  sub: 'AMPLITUDE / AUTO-PAN',
  hp: 4,
  cat: 'FX',
  look: 'tape',
  worklet: 'trem',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.05, max: 20, initial: 4, fmt: 'fHz', curve: 'log', big: true },
    { id: 'depth', label: 'DEPTH', min: 0, max: 1, initial: 0.7, fmt: 'fPc' },
  ],
  sws: [{ id: 'shape', label: 'SHAPE', options: ['SIN', 'TRI', 'SQR'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'sync', label: 'SYNC', kind: 'g' },
  ],
  outs: [
    { id: 'l', label: 'L', kind: 'a' },
    { id: 'r', label: 'R', kind: 'a' },
  ],
};
