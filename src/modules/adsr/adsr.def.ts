import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'adsr',
  name: 'ADSR',
  sub: 'ENVELOPE',
  hp: 4,
  cat: 'ENV / FUNC',
  look: 'atelier',
  worklet: 'adsr',
  knobs: [
    { id: 'a', label: 'ATTACK', min: 0.001, max: 3, initial: 0.01, fmt: 'fMs', curve: 'log' },
    { id: 'd', label: 'DECAY', min: 0.005, max: 4, initial: 0.25, fmt: 'fMs', curve: 'log' },
    { id: 's', label: 'SUSTAIN', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
    { id: 'r', label: 'RELEASE', min: 0.005, max: 6, initial: 0.4, fmt: 'fMs', curve: 'log' },
  ],
  ins: [{ id: 'gate', label: 'GATE', kind: 'g' }],
  outs: [
    { id: 'out', label: 'ENV', kind: 'c' },
    { id: 'inv', label: 'INV', kind: 'c' },
  ],
  display: 'env',
};
