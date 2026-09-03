import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'mult',
  name: 'MULT',
  sub: '1 → 4 SPLITTER',
  hp: 4,
  cat: 'AMP / MIX',
  native: 'mult',
  knobs: [{ id: 'inA', label: 'IN', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'in' }],
  ins: [{ id: 'in', label: 'IN', kind: 'c' }],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'c' },
    { id: 'o2', label: 'OUT 2', kind: 'c' },
    { id: 'o3', label: 'OUT 3', kind: 'c' },
    { id: 'o4', label: 'OUT 4', kind: 'c' },
  ],
};
