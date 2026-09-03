import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'vca',
  name: 'VCA ×2',
  sub: 'DUAL AMPLIFIER',
  hp: 4,
  cat: 'AMP / MIX',
  look: 'lab',
  worklet: 'vca',
  knobs: [
    { id: 'g1', label: 'LEVEL 1', min: 0, max: 1.5, initial: 1, fmt: 'fPc', cvIn: 'cv1' },
    { id: 'g2', label: 'LEVEL 2', min: 0, max: 1.5, initial: 1, fmt: 'fPc', cvIn: 'cv2' },
    { id: 'cv1A', label: 'CV 1', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv1' },
    { id: 'cv2A', label: 'CV 2', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv2' },
  ],
  sws: [{ id: 'exp', label: 'RESPONSE', options: ['LIN', 'EXP'] }],
  ins: [
    { id: 'in1', label: 'IN 1', kind: 'a' },
    { id: 'cv1', label: 'CV 1', kind: 'c' },
    { id: 'in2', label: 'IN 2', kind: 'a' },
    { id: 'cv2', label: 'CV 2', kind: 'c' },
  ],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'a' },
    { id: 'o2', label: 'OUT 2', kind: 'a' },
  ],
};
