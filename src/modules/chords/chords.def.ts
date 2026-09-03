import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'chords',
  name: 'CHORD',
  sub: 'ROOT → FOUR VOICES',
  hp: 6,
  cat: 'SEQ / CTRL',
  look: 'voice',
  worklet: 'chords',
  dark: true,
  knobs: [
    { id: 'type', label: 'TYPE', min: 0, max: 11, initial: 0, fmt: 'fChord', big: true },
    { id: 'inv', label: 'INVERSION', min: 0, max: 3, initial: 0, fmt: 'fInt' },
  ],
  ins: [{ id: 'in', label: 'ROOT', kind: 'p' }],
  outs: [
    { id: 'v1', label: 'V1', kind: 'p' },
    { id: 'v2', label: 'V2', kind: 'p' },
    { id: 'v3', label: 'V3', kind: 'p' },
    { id: 'v4', label: 'V4', kind: 'p' },
  ],
};
