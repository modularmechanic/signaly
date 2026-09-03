import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'quant',
  name: 'QUANT',
  sub: 'SCALE QUANTISER',
  hp: 6,
  cat: 'SEQ / CTRL',
  look: 'board',
  worklet: 'quant',
  dark: true,
  knobs: [
    { id: 'root', label: 'ROOT', min: 0, max: 11, initial: 0, fmt: 'fKey', big: true },
    { id: 'transpose', label: 'TRANSPOSE', min: -24, max: 24, initial: 0, fmt: 'fSemi' },
    { id: 'glide', label: 'GLIDE', min: 0.001, max: 1, initial: 0.02, fmt: 'fMs', curve: 'log' },
  ],
  sws: [
    {
      id: 'scale',
      label: 'SCALE',
      options: ['CHROMATIC', 'MAJOR', 'MINOR', 'DORIAN', 'PENTA', 'WHOLE'],
    },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'p' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
  ],
  outs: [
    { id: 'out', label: 'OUT', kind: 'p' },
    { id: 'change', label: 'CHANGE', kind: 'g' },
  ],
};
