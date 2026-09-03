import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'super',
  name: 'SUPER',
  sub: 'SEVEN SAW UNISON',
  hp: 6,
  cat: 'SOURCES',
  look: 'carbon',
  worklet: 'super',
  knobs: [
    { id: 'tune', label: 'TUNE', min: -3, max: 3, initial: 0, fmt: 'fInt', big: true },
    { id: 'det', label: 'DETUNE', min: 0, max: 1, initial: 0.3, fmt: 'fPc', cvIn: 'dcv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'detA', label: 'DETUNE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'dcv', label: 'DETUNE CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'L', kind: 'a' },
    { id: 'r', label: 'R', kind: 'a' },
  ],
};
