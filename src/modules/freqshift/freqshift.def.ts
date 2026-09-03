import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'freqshift',
  name: 'FREQ SHIFT',
  sub: 'BODE FREQUENCY SHIFTER',
  hp: 6,
  cat: 'FX',
  look: 'carbon',
  worklet: 'freqshift',
  dark: true,
  knobs: [
    { id: 'shift', label: 'SHIFT', min: -1000, max: 1000, initial: 100, fmt: 'fHz', big: true, cvIn: 'scv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'scvA', label: 'SHIFT CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'scv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'scv', label: 'SHIFT CV', kind: 'c' },
  ],
  outs: [
    { id: 'up', label: 'UP', kind: 'a' },
    { id: 'down', label: 'DOWN', kind: 'a' },
  ],
};
