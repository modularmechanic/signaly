import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'fuzz',
  name: 'FUZZ',
  sub: 'GERMANIUM / SILICON',
  hp: 4,
  cat: 'FX',
  look: 'carbon',
  worklet: 'fuzz',
  dark: true,
  knobs: [
    {
      id: 'fuzz',
      label: 'FUZZ',
      min: 0.3,
      max: 20,
      initial: 4,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'fcv',
    },
    { id: 'gate', label: 'GATE', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'starve', label: 'STARVE', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'fcvA', label: 'FUZZ CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['GERM', 'SIL'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'fcv', label: 'FUZZ CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
