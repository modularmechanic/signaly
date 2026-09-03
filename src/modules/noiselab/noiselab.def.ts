import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'noiselab',
  name: 'NOISE LAB',
  sub: 'COLOR · DUST · RANDOM',
  hp: 6,
  cat: 'SOURCES',
  worklet: 'noiselab',
  dark: true,
  knobs: [
    {
      id: 'color',
      label: 'COLOR',
      min: -1,
      max: 1,
      initial: 0,
      fmt: 'f1',
      curve: 'lin',
      big: true,
      cvIn: 'color',
    },
    { id: 'cut', label: 'CUTOFF', min: 60, max: 18000, initial: 8000, fmt: 'fHz', curve: 'log', cvIn: 'cut' },
    { id: 'dec', label: 'BURST DEC', min: 0.005, max: 2, initial: 0.15, fmt: 'fMs', curve: 'log' },
    { id: 'dens', label: 'DENSITY', min: 0.5, max: 500, initial: 20, fmt: 'fHz', curve: 'log' },
    { id: 'colorA', label: 'COLOR CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'color' },
    { id: 'cutA', label: 'CUT CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cut' },
  ],
  ins: [
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'color', label: 'COLOR CV', kind: 'c' },
    { id: 'cut', label: 'CUT CV', kind: 'c' },
  ],
  outs: [
    { id: 'out', label: 'NOISE', kind: 'a' },
    { id: 'dust', label: 'DUST', kind: 'a' },
    { id: 'rnd', label: 'RANDOM', kind: 'c' },
    { id: 'burst', label: 'BURST', kind: 'a' },
  ],
};
