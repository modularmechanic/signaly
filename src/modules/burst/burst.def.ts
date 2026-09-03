import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'burst',
  name: 'BURST',
  sub: 'RATCHET GENERATOR',
  hp: 4,
  cat: 'SEQ / CTRL',
  look: 'signal',
  worklet: 'burst',
  dark: true,
  knobs: [
    { id: 'count', label: 'COUNT', min: 1, max: 16, initial: 4, fmt: 'fInt', big: true, cvIn: 'ccv' },
    { id: 'space', label: 'SPACING', min: 0.005, max: 0.5, initial: 0.06, fmt: 'fMs', curve: 'log' },
    { id: 'curve', label: 'CURVE', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'ccvamt', label: 'COUNT CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'ccv' },
  ],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'ccv', label: 'COUNT CV', kind: 'c' },
  ],
  outs: [
    { id: 'out', label: 'OUT', kind: 'g' },
    { id: 'eoc', label: 'EOC', kind: 'g' },
  ],
};
