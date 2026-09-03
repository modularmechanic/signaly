import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'mix',
  name: 'MIX 4',
  sub: 'UNITY MIXER',
  hp: 4,
  cat: 'AMP / MIX',
  look: 'console',
  native: 'mix',
  knobs: [
    { id: 'l1', label: 'CH 1', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'l2', label: 'CH 2', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'l3', label: 'CH 3', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'l4', label: 'CH 4', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
  ],
  ins: [
    { id: 'i1', label: 'IN 1', kind: 'a' },
    { id: 'i2', label: 'IN 2', kind: 'a' },
    { id: 'i3', label: 'IN 3', kind: 'a' },
    { id: 'i4', label: 'IN 4', kind: 'a' },
  ],
  outs: [{ id: 'out', label: 'MIX OUT', kind: 'a' }],
};
