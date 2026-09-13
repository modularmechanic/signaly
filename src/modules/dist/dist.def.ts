import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'dist',
  name: 'DIST',
  sub: 'DRIVE / FOLD / CLIP',
  hp: 6,
  cat: 'FX',
  look: 'patina',
  worklet: 'dist',
  dark: true,
  knobs: [
    { id: 'drive', label: 'DRIVE', min: 0.5, max: 15, initial: 3, fmt: 'f1', curve: 'log', big: true, cvIn: 'dcv' },
    { id: 'tone', label: 'TONE', min: 400, max: 16000, initial: 5000, fmt: 'fHz', curve: 'log', cvIn: 'tocv' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc', cvIn: 'lcv' },
    att('dcv', 'DRIVE CV'),
    att('tocv', 'TONE CV'),
    att('lcv', 'LEVEL CV'),
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['TANH', 'FOLD', 'CLIP'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
    { id: 'tocv', label: 'TONE CV', kind: 'c' },
    { id: 'lcv', label: 'LEVEL CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
