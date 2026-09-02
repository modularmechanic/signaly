import type { JackDef, ModuleDef } from '../../core/types';
import { panel } from './scope.panel';

const chans = [1, 2, 3, 4];

export const def: ModuleDef = {
  id: 'scope',
  name: 'SCOPE',
  sub: 'OSCILLOSCOPE',
  hp: 10,
  cat: 'METERS',
  native: 'scope',
  dark: true,
  knobs: [
    { id: 'time', label: 'TIME', min: 0.05, max: 1, def: 0.25, fmt: 'fPc' },
    { id: 'scale1', label: 'A GAIN', min: 0.2, max: 3, def: 1, fmt: 'f1' },
    { id: 'scale2', label: 'B GAIN', min: 0.2, max: 3, def: 1, fmt: 'f1' },
    { id: 'scale3', label: 'C GAIN', min: 0.2, max: 3, def: 1, fmt: 'f1' },
    { id: 'scale4', label: 'D GAIN', min: 0.2, max: 3, def: 1, fmt: 'f1' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['SCOPE', 'X/Y', 'SPECTRUM'], def: 0 }],
  ins: chans.map((c): JackDef => ({ id: `in${c}`, label: `IN ${c}`, kind: 'a' })),
  outs: chans.map((c): JackDef => ({ id: `thru${c}`, label: `THRU ${c}`, kind: 'a' })),
  display: 'scope',
  panel,
};
