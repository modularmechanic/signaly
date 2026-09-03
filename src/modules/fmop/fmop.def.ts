import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'fmop',
  name: 'FM OP',
  sub: 'TWO OPERATOR FM',
  hp: 6,
  cat: 'SOURCES',
  look: 'board',
  worklet: 'fmop',
  knobs: [
    { id: 'tune', label: 'TUNE', min: -3, max: 3, initial: 0, fmt: 'fInt', big: true },
    { id: 'ratio', label: 'RATIO', min: 0.25, max: 8, initial: 1, fmt: 'f1' },
    { id: 'index', label: 'INDEX', min: 0, max: 10, initial: 0, fmt: 'f1', cvIn: 'icv' },
    { id: 'idxA', label: 'INDEX CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'icv' },
    { id: 'fb', label: 'FEEDBACK', min: 0, max: 1, initial: 0, fmt: 'fPc' },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'icv', label: 'INDEX CV', kind: 'c' },
    { id: 'sync', label: 'SYNC', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
