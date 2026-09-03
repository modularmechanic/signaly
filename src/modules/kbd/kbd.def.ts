import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'kbd',
  name: 'KEYBOARD',
  sub: 'CV / GATE CONTROLLER',
  hp: 10,
  cat: 'SEQ / CTRL',
  look: 'atelier',
  native: 'kbd',
  knobs: [],
  ins: [],
  outs: [
    { id: 'cv', label: 'V/OCT', kind: 'p' },
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
  ],
  display: 'piano',
};
