import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'ms20',
  name: 'MS-20',
  sub: 'KORG35 LOW / HIGH PASS',
  hp: 4,
  cat: 'FILTERS',
  look: 'noir',
  worklet: 'ms20',
  dark: true,
  knobs: [
    {
      id: 'cut',
      label: 'CUTOFF',
      min: 30,
      max: 16000,
      initial: 900,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'cv',
    },
    { id: 'res', label: 'PEAK', min: 0, max: 1, initial: 0.4, fmt: 'fPc' },
    { id: 'cvA', label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['LP', 'HP'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'cv', label: 'FREQ CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
