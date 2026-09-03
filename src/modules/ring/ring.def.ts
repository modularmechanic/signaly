import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'ring',
  name: 'RING',
  sub: 'RING MODULATOR',
  hp: 4,
  cat: 'AMP / MIX',
  worklet: 'ring',
  knobs: [
    { id: 'depth', label: 'DEPTH', min: 0, max: 1, initial: 1, fmt: 'fPc', big: true, cvIn: 'dcv' },
    { id: 'offset', label: 'OFFSET', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'dcvamt', label: 'DEPTH CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  ins: [
    { id: 'x', label: 'X', kind: 'a' },
    { id: 'y', label: 'Y', kind: 'a' },
    { id: 'dcv', label: 'DEPTH CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
