import type { ModuleDef } from '../../core/types';
import { panel } from './out.panel';

export const def: ModuleDef = {
  id: 'out',
  name: 'MAIN OUT',
  sub: 'STEREO · LIMITER · METERS',
  hp: 6,
  cat: 'OUTPUT',
  native: 'out',
  dark: true,
  knobs: [{ id: 'level', label: 'LEVEL', min: 0, max: 1.4, def: 0.9, fmt: 'fPc', big: true }],
  sws: [
    { id: 'spectrum', label: 'SPECTRUM', options: ['OFF', 'ON'], def: 0 },
    { id: 'phase', label: 'PHASE', options: ['OFF', 'ON'], def: 0 },
  ],
  ins: [
    { id: 'l', label: 'IN L', kind: 'a' },
    { id: 'r', label: 'IN R', kind: 'a' },
  ],
  outs: [],
  display: 'meter',
  panel,
};
