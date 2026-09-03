import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'reson',
  name: 'RESON',
  sub: 'THREE PEAK RESONATOR',
  hp: 6,
  cat: 'FILTERS',
  look: 'anodic',
  worklet: 'reson',
  knobs: [
    {
      id: 'freq',
      label: 'FREQ',
      min: 30,
      max: 6000,
      initial: 220,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'spread', label: 'SPREAD', min: 0, max: 24, initial: 7, fmt: 'fSemi' },
    { id: 'dec', label: 'DECAY', min: 0.02, max: 8, initial: 0.8, fmt: 'fMs', curve: 'log' },
    { id: 'cvA', label: 'FREQ CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
    { id: 'strike', label: 'STRIKE', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
