import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'mult',
  name: 'MULT',
  sub: '1 → 4 SPLITTER',
  hp: 2,
  cat: 'AMP / MIX',
  look: 'lab',
  native: 'mult',
  knobs: [att('in', 'IN')],
  ins: [{ id: 'in', label: 'IN', kind: 'c' }],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'c' },
    { id: 'o2', label: 'OUT 2', kind: 'c' },
    { id: 'o3', label: 'OUT 3', kind: 'c' },
    { id: 'o4', label: 'OUT 4', kind: 'c' },
  ],
};
