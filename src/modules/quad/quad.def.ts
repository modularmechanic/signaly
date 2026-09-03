import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'quad',
  name: 'QUAD VCO',
  sub: 'FOUR-OSC STACK',
  hp: 10,
  cat: 'SOURCES',
  worklet: 'quad',
  knobs: [
    { id: 'oct', label: 'OCTAVE', min: -3, max: 3, initial: 0, fmt: 'fInt', curve: 'lin', big: true },
    {
      id: 'det',
      label: 'SPREAD',
      min: 0,
      max: 50,
      initial: 8,
      fmt: 'fInt',
      curve: 'lin',
      big: true,
      cvIn: 'det',
    },
    { id: 'detA', label: 'SPREAD CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'det' },
  ],
  sws: [{ id: 'wave', label: 'WAVE', options: ['SIN', 'TRI', 'SAW', 'SQR'] }],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'det', label: 'SPREAD CV', kind: 'c' },
  ],
  outs: [
    { id: 'o1', label: 'OSC 1', kind: 'a' },
    { id: 'o2', label: 'OSC 2', kind: 'a' },
    { id: 'o3', label: 'OSC 3', kind: 'a' },
    { id: 'o4', label: 'OSC 4', kind: 'a' },
    { id: 'mix', label: 'FAT MIX', kind: 'a' },
  ],
};
