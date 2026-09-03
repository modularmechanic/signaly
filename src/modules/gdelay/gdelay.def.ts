import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'gdelay',
  name: 'GRAIN DELAY',
  sub: 'GRANULAR DELAY LINE',
  hp: 10,
  cat: 'FX',
  look: 'grid',
  worklet: 'gdelay',
  knobs: [
    { id: 'size', label: 'SIZE', min: 0.01, max: 0.4, initial: 0.12, fmt: 'fMs', curve: 'log', big: true },
    { id: 'dens', label: 'DENSITY', min: 0.5, max: 40, initial: 6, fmt: 'fHz', curve: 'log' },
    { id: 'pitch', label: 'PITCH', min: -24, max: 24, initial: 0, fmt: 'fSemi', cvIn: 'pcv' },
    { id: 'spray', label: 'SPRAY', min: 0, max: 1, initial: 0.2, fmt: 'fPc' },
    { id: 'fb', label: 'FEEDBACK', min: 0, max: 0.95, initial: 0.3, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'pcvA', label: 'PITCH CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'pcv' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'pcv', label: 'PITCH CV', kind: 'c' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
