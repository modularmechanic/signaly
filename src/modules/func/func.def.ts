import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'func',
  name: 'FUNKTION',
  sub: 'SLOPE / SLEW / LFO',
  hp: 4,
  cat: 'ENV / FUNC',
  worklet: 'func',
  dark: true,
  knobs: [
    { id: 'rise', label: 'RISE', min: 0.001, max: 8, initial: 0.05, fmt: 'fMs', curve: 'log', big: true },
    { id: 'fall', label: 'FALL', min: 0.001, max: 8, initial: 0.4, fmt: 'fMs', curve: 'log', big: true },
    { id: 'inA', label: 'SIGNAL', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'in' },
  ],
  sws: [{ id: 'cycle', label: 'CYCLE', options: ['OFF', 'ON'] }],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'in', label: 'SIGNAL', kind: 'c' },
  ],
  outs: [
    { id: 'out', label: 'OUT', kind: 'c' },
    { id: 'eoc', label: 'EOC', kind: 'g' },
  ],
};
