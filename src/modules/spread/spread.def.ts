import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'spread',
  name: 'SPREAD',
  sub: 'MID-SIDE IMAGER',
  hp: 4,
  cat: 'FX',
  look: 'lab',
  worklet: 'spread',
  knobs: [
    { id: 'width', label: 'WIDTH', min: 0, max: 2, initial: 1, fmt: 'fPc', big: true, cvIn: 'wcv' },
    { id: 'wcvA', label: 'WIDTH CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'wcv' },
    {
      id: 'bass',
      label: 'BASS MONO',
      min: 20,
      max: 500,
      initial: 120,
      fmt: 'fHz',
      curve: 'log',
    },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  ins: [
    { id: 'l', label: 'IN L', kind: 'a' },
    { id: 'r', label: 'IN R', kind: 'a' },
    { id: 'wcv', label: 'WIDTH CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'OUT L', kind: 'a' },
    { id: 'r', label: 'OUT R', kind: 'a' },
  ],
};
