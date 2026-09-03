import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'voct',
  name: 'V/OCT',
  sub: 'PITCH SHIFT · ±24',
  hp: 4,
  cat: 'UTILITY',
  native: 'voct',
  dark: true,
  knobs: [
    { id: 'steps', label: 'SEMITONES', min: -24, max: 24, initial: 0, fmt: 'fInt', big: true, fader: true },
    { id: 'cvA', label: 'CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  sws: [{ id: 'lock', label: 'OCT LOCK', options: ['GLIDE', 'LOCK'], initial: 1 }],
  ins: [
    { id: 'in', label: 'V/OCT IN', kind: 'p' },
    { id: 'cv', label: 'CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'V/OCT OUT', kind: 'p' }],
  display: 'text',
};
