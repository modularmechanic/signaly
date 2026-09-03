import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'grain',
  name: 'GRAIN',
  sub: 'GRANULAR TEXTURE',
  hp: 10,
  cat: 'SOURCES',
  worklet: 'grain',
  knobs: [
    { id: 'size', label: 'SIZE', min: 0.005, max: 0.5, initial: 0.06, fmt: 'fMs', curve: 'log', big: true },
    { id: 'dens', label: 'DENSITY', min: 0.5, max: 50, initial: 8, fmt: 'fHz', curve: 'log' },
    { id: 'pitch', label: 'PITCH', min: -24, max: 24, initial: 0, fmt: 'fSemi' },
    { id: 'spray', label: 'SPRAY', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'pos', label: 'POSITION', min: 0, max: 1, initial: 0.2, fmt: 'fPc', cvIn: 'poscv' },
    { id: 'posA', label: 'POS CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'poscv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.6, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'poscv', label: 'POS CV', kind: 'c' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
  ],
  outs: [
    { id: 'l', label: 'L', kind: 'a' },
    { id: 'r', label: 'R', kind: 'a' },
  ],
};
