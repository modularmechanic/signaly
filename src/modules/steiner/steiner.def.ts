import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'steiner',
  name: 'STEINER',
  sub: 'STEINER-PARKER MULTIMODE',
  hp: 4,
  cat: 'FILTERS',
  look: 'press',
  worklet: 'steiner',
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 30,
      max: 16000,
      initial: 800,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'RES', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'cvA', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['LP', 'BP', 'HP', 'AP'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
