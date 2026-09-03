import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'freeze',
  name: 'FREEZE',
  sub: 'BUFFER FREEZE',
  hp: 8,
  cat: 'FX',
  worklet: 'freeze',
  knobs: [
    { id: 'size', label: 'SIZE', min: 20, max: 2000, initial: 250, fmt: 'fMs', curve: 'log', big: true },
    { id: 'pitch', label: 'PITCH', min: -24, max: 24, initial: 0, fmt: 'fSemi', cvIn: 'pcv' },
    { id: 'smooth', label: 'SMOOTH', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['GATE', 'TOGGLE'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'freeze', label: 'FREEZE', kind: 'g' },
    { id: 'pcv', label: 'PITCH CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'L', kind: 'a' },
    { id: 'r', label: 'R', kind: 'a' },
  ],
  leds: ['frozen'],
};
