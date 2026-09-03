import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'xfade',
  name: 'XFADE',
  sub: 'CROSSFADE / PAN',
  hp: 4,
  cat: 'AMP / MIX',
  look: 'slateware',
  worklet: 'xfade',
  knobs: [
    { id: 'fade', label: 'FADE', min: 0, max: 1, initial: 0.5, fmt: 'fPc', big: true, cvIn: 'fcv' },
    { id: 'fcvamt', label: 'FADE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
    { id: 'pan', label: 'PAN', min: -1, max: 1, initial: 0, fmt: 'f1', cvIn: 'pcv' },
    { id: 'pcvamt', label: 'PAN CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'pcv' },
  ],
  ins: [
    { id: 'a', label: 'A', kind: 'a' },
    { id: 'b', label: 'B', kind: 'a' },
    { id: 'fcv', label: 'FADE CV', kind: 'c' },
    { id: 'pcv', label: 'PAN CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'L', kind: 'a' },
    { id: 'r', label: 'R', kind: 'a' },
  ],
};
