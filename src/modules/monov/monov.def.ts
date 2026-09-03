import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'monov',
  name: 'MONOVOX',
  sub: 'COMPLETE MONO VOICE',
  hp: 6,
  cat: 'VOICES',
  worklet: 'monov',
  dark: true,
  knobs: [
    { id: 'glide', label: 'GLIDE', min: 0.001, max: 0.5, initial: 0.02, fmt: 'fMs', curve: 'log' },
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 60,
      max: 12000,
      initial: 1400,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'fcv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'env', label: 'ENV→FLT', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
    { id: 'fcv', label: 'CUT CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
    { id: 'a', label: 'ATK', min: 0.001, max: 2, initial: 0.005, fmt: 'fMs', curve: 'log' },
    { id: 'd', label: 'DEC', min: 0.01, max: 3, initial: 0.25, fmt: 'fMs', curve: 'log' },
    { id: 's', label: 'SUS', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'r', label: 'REL', min: 0.01, max: 4, initial: 0.3, fmt: 'fMs', curve: 'log' },
    { id: 'accA', label: 'ACCENT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'acc' },
  ],
  sws: [{ id: 'wave', label: 'WAVE', options: ['SAW', 'SQR'] }],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'fcv', label: 'CUT CV', kind: 'c' },
    { id: 'acc', label: 'ACCENT', kind: 'c' },
  ],
  outs: [
    { id: 'out', label: 'OUT', kind: 'a' },
    { id: 'env', label: 'ENV', kind: 'c' },
  ],
};
