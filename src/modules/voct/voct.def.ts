import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'voct',
  name: 'V/OCT',
  sub: 'PITCH SHIFT · ±24',
  hp: 4,
  cat: 'UTILITY',
  look: 'signal',
  native: 'voct',
  dark: true,
  knobs: [
    { id: 'steps', label: 'SEMITONES', min: -24, max: 24, initial: 0, fmt: 'fInt', big: true, fader: true },
    att('cv', 'CV'),
  ],
  sws: [{ id: 'lock', label: 'OCT LOCK', options: ['GLIDE', 'LOCK'], initial: 1 }],
  ins: [
    { id: 'in', label: 'V/OCT IN', kind: 'p' },
    { id: 'cv', label: 'CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'V/OCT OUT', kind: 'p' }],
  display: 'text',
};
