import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'duo',
  name: 'DUO VCO',
  sub: 'DUAL OSCILLATOR',
  hp: 10,
  cat: 'SOURCES',
  look: 'bronze',
  worklet: 'duo',
  knobs: [
    { id: 'oct', label: 'OCTAVE', min: -3, max: 3, initial: 0, fmt: 'fInt', curve: 'lin', big: true },
    { id: 'semi', label: 'INTERVAL', min: -12, max: 12, initial: 0, fmt: 'fSemi' },
    { id: 'det', label: 'DETUNE', min: 0, max: 50, initial: 6, fmt: 'fInt' },
    { id: 'mix', label: 'OSC MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc', cvIn: 'mix' },
    { id: 'fmA', label: 'FM', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fm' },
    { id: 'mixA', label: 'MIX CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'mix' },
  ],
  sws: [
    { id: 'w1', label: 'WAVE 1', options: ['SIN', 'TRI', 'SAW', 'SQR'] },
    { id: 'w2', label: 'WAVE 2', options: ['SIN', 'TRI', 'SAW', 'SQR'] },
    { id: 'sync', label: 'SYNC', options: ['OFF', 'ON'] },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'fm', label: 'FM', kind: 'c' },
    { id: 'mix', label: 'MIX CV', kind: 'c' },
  ],
  outs: [
    { id: 'o1', label: 'OSC 1', kind: 'a' },
    { id: 'o2', label: 'OSC 2', kind: 'a' },
    { id: 'mix', label: 'MIX', kind: 'a' },
  ],
};
