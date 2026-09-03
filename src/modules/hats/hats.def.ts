import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'hats',
  name: 'HATS',
  sub: 'METALLIC HI-HAT',
  hp: 6,
  cat: 'DRUMS',
  worklet: 'hats',
  dark: true,
  knobs: [
    { id: 'tone', label: 'TONE', min: 800, max: 12000, initial: 5000, fmt: 'fHz', curve: 'log', big: true },
    { id: 'cdec', label: 'CLOSED DEC', min: 0.005, max: 0.3, initial: 0.04, fmt: 'fMs', curve: 'log' },
    { id: 'odec', label: 'OPEN DEC', min: 0.05, max: 2, initial: 0.5, fmt: 'fMs', curve: 'log' },
    { id: 'metal', label: 'METAL', min: 0, max: 1, initial: 0.8, fmt: 'fPc' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1, initial: 0.7, fmt: 'fPc' },
  ],
  ins: [
    { id: 'closed', label: 'CLOSED', kind: 'g' },
    { id: 'open', label: 'OPEN', kind: 'g' },
    { id: 'acc', label: 'ACCENT', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
