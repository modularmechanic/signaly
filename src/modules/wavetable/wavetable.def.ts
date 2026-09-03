import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'wavetable',
  name: 'WAVETABLE',
  sub: 'SCANNING OSCILLATOR',
  hp: 8,
  cat: 'SOURCES',
  worklet: 'wavetable',
  knobs: [
    { id: 'tune', label: 'TUNE', min: -3, max: 3, initial: 0, fmt: 'fInt', big: true },
    { id: 'fine', label: 'FINE', min: -7, max: 7, initial: 0, fmt: 'fSemi' },
    { id: 'pos', label: 'POSITION', min: 0, max: 1, initial: 0, fmt: 'fPc', cvIn: 'poscv' },
    { id: 'posA', label: 'POS CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'poscv' },
    { id: 'fm', label: 'FM AMT', min: 0, max: 1, initial: 0, fmt: 'fPc', cvIn: 'fm' },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'poscv', label: 'POS CV', kind: 'c' },
    { id: 'fm', label: 'FM', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
