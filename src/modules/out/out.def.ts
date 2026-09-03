import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'out',
  name: 'MAIN OUT',
  sub: 'STEREO · LIMITER · METERS',
  hp: 6,
  cat: 'OUTPUT',
  native: 'out',
  dark: true,
  knobs: [{ id: 'level', label: 'LEVEL', min: 0, max: 1.4, initial: 0.5, fmt: 'fPc', big: true }],
  sws: [
    { id: 'spectrum', label: 'SPECTRUM', options: ['OFF', 'ON'], initial: 0 },
    { id: 'phase', label: 'PHASE', options: ['OFF', 'ON'], initial: 0 },
  ],
  ins: [
    { id: 'l', label: 'IN L', kind: 'a' },
    { id: 'r', label: 'IN R', kind: 'a' },
  ],
  outs: [],
  display: 'meter',
};
