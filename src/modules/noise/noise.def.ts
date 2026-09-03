import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'noise',
  name: 'NOISE',
  sub: 'WHITE / PINK',
  hp: 2,
  cat: 'SOURCES',
  worklet: 'noise',
  knobs: [],
  ins: [],
  outs: [
    { id: 'wht', label: 'WHITE', kind: 'a' },
    { id: 'pnk', label: 'PINK', kind: 'a' },
  ],
};
