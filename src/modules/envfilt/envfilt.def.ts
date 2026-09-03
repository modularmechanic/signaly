import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'envfilt',
  name: 'ENV FILTER',
  sub: 'AUTO-WAH',
  hp: 6,
  cat: 'FX',
  look: 'anodic',
  worklet: 'envfilt',
  knobs: [
    { id: 'sens', label: 'SENS', min: 0, max: 1, initial: 0.6, fmt: 'fPc', big: true },
    { id: 'freq', label: 'BASE FREQ', min: 40, max: 4000, initial: 400, fmt: 'fHz', curve: 'log' },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'atk', label: 'ATTACK', min: 0.001, max: 0.2, initial: 0.01, fmt: 'fMs', curve: 'log' },
    { id: 'rel', label: 'RELEASE', min: 0.01, max: 1, initial: 0.15, fmt: 'fMs', curve: 'log' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  sws: [{ id: 'dir', label: 'DIRECTION', options: ['UP', 'DOWN'] }],
  ins: [{ id: 'in', label: 'IN', kind: 'a' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
