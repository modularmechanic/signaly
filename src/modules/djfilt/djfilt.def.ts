import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'djfilt',
  name: 'DJ FILTER',
  sub: 'ONE-KNOB LP ↔ HP',
  hp: 4,
  cat: 'FILTERS',
  look: 'arc',
  worklet: 'djfilt',
  knobs: [
    { id: 'sweep', label: 'SWEEP', min: -1, max: 1, initial: 0, fmt: 'f1', big: true, cvIn: 'cv' },
    { id: 'cvA', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'SWEEP CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
