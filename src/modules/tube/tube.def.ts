import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'tube',
  name: 'TUBE',
  sub: '12AX7 · 12AU7 · EL34 · KT88',
  hp: 8,
  cat: 'FX',
  look: 'stage',
  worklet: 'tube',
  dark: true,
  display: 'text',
  knobs: [
    {
      id: 'drive',
      label: 'DRIVE',
      min: 0.5,
      max: 15,
      initial: 3,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'dcv',
    },
    { id: 'bias', label: 'BIAS', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'sag', label: 'SAG', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'tone', label: 'TONE', min: 400, max: 16000, initial: 6000, fmt: 'fHz', curve: 'log' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'dcvA', label: 'DRIVE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  sws: [{ id: 'type', label: 'TYPE', options: ['12AX7', '12AU7', '6L6', 'EL34', 'KT88'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
