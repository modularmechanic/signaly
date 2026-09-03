import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'volt',
  name: 'VOLTS',
  sub: 'CV + LEVEL METER',
  hp: 4,
  cat: 'METERS',
  look: 'lab',
  native: 'volt',
  dark: true,
  knobs: [{ id: 'inA', label: 'IN', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'in' }],
  ins: [{ id: 'in', label: 'IN', kind: 'c' }],
  outs: [{ id: 'thru', label: 'THRU', kind: 'c' }],
  display: 'text',
};
