import type { ModuleDef } from '../../core/types';
import { panel } from './volt.panel';

export const def: ModuleDef = {
  id: 'volt',
  name: 'VOLTS',
  sub: 'CV + LEVEL METER',
  hp: 2,
  cat: 'METERS',
  native: 'volt',
  dark: true,
  knobs: [{ id: 'inA', label: 'IN', min: -1, max: 1, def: 0, fmt: 'f1', attenuates: 'in' }],
  ins: [{ id: 'in', label: 'IN', kind: 'c' }],
  outs: [{ id: 'thru', label: 'THRU', kind: 'c' }],
  display: 'text',
  panel,
};
