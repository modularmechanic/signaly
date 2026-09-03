import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'slicer',
  name: 'SLICER',
  sub: 'CHOP A SAMPLE INTO N SLICES',
  hp: 10,
  cat: 'SOURCES',
  look: 'lab',
  worklet: 'slicer',
  knobs: [{ id: 'slices', label: 'SLICES', min: 1, max: 16, initial: 8, fmt: 'fInt', big: true }],
  ins: [
    { id: 'sel', label: 'SLICE CV', kind: 'c' },
    { id: 'trig', label: 'STEP', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: 'text',
};
