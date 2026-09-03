import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'comp',
  name: 'COMP',
  sub: 'STEREO COMPRESSOR',
  hp: 8,
  cat: 'AMP / MIX',
  look: 'console',
  worklet: 'comp',
  display: 'meter',
  knobs: [
    { id: 'thr', label: 'THRESHOLD', min: -60, max: 0, initial: -18, fmt: 'f1' },
    { id: 'ratio', label: 'RATIO', min: 1, max: 20, initial: 4, fmt: 'f1' },
    { id: 'atk', label: 'ATTACK', min: 0.0001, max: 0.1, initial: 0.01, fmt: 'fMs', curve: 'log' },
    { id: 'rel', label: 'RELEASE', min: 0.005, max: 1, initial: 0.12, fmt: 'fMs', curve: 'log' },
    { id: 'knee', label: 'KNEE', min: 0, max: 24, initial: 6, fmt: 'f1' },
    { id: 'makeup', label: 'MAKEUP', min: 0, max: 24, initial: 0, fmt: 'f1' },
  ],
  sws: [{ id: 'limit', label: 'LIMIT', options: ['OFF', 'ON'] }],
  ins: [
    { id: 'inl', label: 'IN L', kind: 'a' },
    { id: 'inr', label: 'IN R', kind: 'a' },
  ],
  outs: [
    { id: 'outl', label: 'OUT L', kind: 'a' },
    { id: 'outr', label: 'OUT R', kind: 'a' },
  ],
};
