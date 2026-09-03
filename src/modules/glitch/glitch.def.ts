import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'glitch',
  name: 'GLITCH',
  sub: 'BUFFER REPEAT',
  hp: 6,
  cat: 'FX',
  worklet: 'glitch',
  knobs: [
    { id: 'length', label: 'LENGTH', min: 5, max: 500, initial: 80, fmt: 'fMs', curve: 'log', big: true },
    { id: 'repeats', label: 'REPEATS', min: 1, max: 16, initial: 4, fmt: 'fInt' },
    { id: 'prob', label: 'PROBABILITY', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'pitch', label: 'PITCH', min: 0, max: 6, initial: 3, fmt: 'fRate' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  sws: [{ id: 'sync', label: 'SYNC', options: ['FREE', 'CLOCK'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'clock', label: 'CLOCK', kind: 'g' },
    { id: 'trig', label: 'TRIG', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  leds: ['repeating'],
};
