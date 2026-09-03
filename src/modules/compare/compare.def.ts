import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'compare',
  name: 'COMPARE',
  sub: 'WINDOW COMPARATOR',
  hp: 4,
  cat: 'ENV / FUNC',
  worklet: 'compare',
  knobs: [
    { id: 'centre', label: 'CENTRE', min: -5, max: 5, initial: 0, fmt: 'f1', big: true, cvIn: 'ccv' },
    { id: 'width', label: 'WIDTH', min: 0.1, max: 10, initial: 2, fmt: 'f1' },
    { id: 'ccvamt', label: 'CENTRE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'ccv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'c' },
    { id: 'ccv', label: 'CENTRE CV', kind: 'c' },
  ],
  outs: [
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'above', label: 'ABOVE', kind: 'g' },
    { id: 'below', label: 'BELOW', kind: 'g' },
  ],
  leds: ['win'],
};
