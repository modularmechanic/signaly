import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'vco',
  name: 'VCO',
  sub: 'ANALOG OSCILLATOR',
  hp: 8,
  cat: 'SOURCES',
  look: 'analog',
  worklet: 'vco',
  knobs: [
    { id: 'oct', label: 'OCTAVE', min: -3, max: 3, initial: 0, fmt: 'fInt', curve: 'lin', big: true },
    { id: 'fine', label: 'FINE', min: -7, max: 7, initial: 0, fmt: 'fSemi' },
    { id: 'pw', label: 'PW', min: 0.05, max: 0.95, initial: 0.5, fmt: 'fPc', cvIn: 'pwm' },
    { id: 'fm', label: 'FM AMT', min: 0, max: 1, initial: 0, fmt: 'fPc', cvIn: 'fm' },
    { id: 'fmA', label: 'FM', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fm', look: 'trimmer' },
    { id: 'pwmA', label: 'PWM', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'pwm', look: 'trimmer' },
  ],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'fm', label: 'FM', kind: 'c' },
    { id: 'pwm', label: 'PWM', kind: 'c' },
    { id: 'sync', label: 'SYNC', kind: 'g' },
  ],
  outs: [
    { id: 'sin', label: 'SIN', kind: 'a' },
    { id: 'tri', label: 'TRI', kind: 'a' },
    { id: 'saw', label: 'SAW', kind: 'a' },
    { id: 'sqr', label: 'SQR', kind: 'a' },
  ],
};
