import type { ModuleDef } from '../../core/types';

// Time knobs store SECONDS (fMs picks ms/s on readout); dB knobs store raw dB.
export const def: ModuleDef = {
  id: 'gate',
  name: 'GATE',
  sub: 'NOISE GATE',
  hp: 6,
  cat: 'AMP / MIX',
  worklet: 'gate',
  display: 'meter',
  knobs: [
    { id: 'thr', label: 'THRESHOLD', min: -80, max: 0, initial: -40, fmt: 'f1', cvIn: 'thrcv' },
    { id: 'atk', label: 'ATTACK', min: 0.0001, max: 0.05, initial: 0.002, fmt: 'fMs', curve: 'log' },
    { id: 'hold', label: 'HOLD', min: 0, max: 0.5, initial: 0.05, fmt: 'fMs' },
    { id: 'rel', label: 'RELEASE', min: 0.005, max: 1, initial: 0.15, fmt: 'fMs', curve: 'log' },
    { id: 'range', label: 'RANGE', min: -90, max: 0, initial: -60, fmt: 'f1' },
    { id: 'thrcvA', label: 'THRESH CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'thrcv' },
  ],
  ins: [
    { id: 'inl', label: 'IN L', kind: 'a' },
    { id: 'inr', label: 'IN R', kind: 'a' },
    { id: 'thrcv', label: 'THRESH CV', kind: 'c' },
    { id: 'trig', label: 'TRIGGER', kind: 'g' },
  ],
  outs: [
    { id: 'outl', label: 'OUT L', kind: 'a' },
    { id: 'outr', label: 'OUT R', kind: 'a' },
    { id: 'gate', label: 'GATE OUT', kind: 'g' },
  ],
};
