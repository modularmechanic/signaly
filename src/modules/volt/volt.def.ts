import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'volt',
  name: 'VOLTS',
  sub: 'CV ATTENUVERTER · THRU',
  hp: 2,
  cat: 'METERS',
  native: 'volt',
  dark: true,
  knobs: [att('in', 'IN')],
  ins: [{ id: 'in', label: 'IN', kind: 'c' }],
  outs: [{ id: 'thru', label: 'THRU', kind: 'c' }],
  display: 'text',
};
