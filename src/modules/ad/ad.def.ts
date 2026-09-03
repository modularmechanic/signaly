import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'ad',
  name: 'AD',
  sub: 'ATTACK / DECAY',
  hp: 4,
  cat: 'ENV / FUNC',
  worklet: 'ad',
  knobs: [
    {
      id: 'a',
      label: 'ATTACK',
      min: 0.001,
      max: 3,
      initial: 0.01,
      fmt: 'fMs',
      curve: 'log',
      big: true,
      cvIn: 'acv',
    },
    { id: 'd', label: 'DECAY', min: 0.005, max: 6, initial: 0.3, fmt: 'fMs', curve: 'log', cvIn: 'dcv' },
    { id: 'curve', label: 'CURVE', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
  ],
  sws: [{ id: 'loop', label: 'LOOP', options: ['ONCE', 'LOOP'] }],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'acv', label: 'ATK CV', kind: 'c' },
    { id: 'dcv', label: 'DEC CV', kind: 'c' },
  ],
  outs: [
    { id: 'out', label: 'ENV', kind: 'c' },
    { id: 'eoc', label: 'EOC', kind: 'g' },
  ],
  leds: ['env'],
};
