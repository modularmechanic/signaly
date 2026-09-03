import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'kick',
  name: 'KICK',
  sub: 'ANALOG BASS DRUM',
  hp: 6,
  cat: 'DRUMS',
  look: 'anodic',
  worklet: 'kick',
  dark: true,
  knobs: [
    {
      id: 'tune',
      label: 'TUNE',
      min: 20,
      max: 200,
      initial: 50,
      fmt: 'fHz',
      curve: 'log',
      big: true,
      cvIn: 'tcv',
    },
    { id: 'pdec', label: 'PITCH DEC', min: 0.005, max: 0.3, initial: 0.04, fmt: 'fMs', curve: 'log' },
    { id: 'adec', label: 'AMP DEC', min: 0.03, max: 2, initial: 0.35, fmt: 'fMs', curve: 'log' },
    { id: 'click', label: 'CLICK', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'drive', label: 'DRIVE', min: 0, max: 1, initial: 0.2, fmt: 'fPc' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1, initial: 0.8, fmt: 'fPc' },
  ],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'acc', label: 'ACCENT', kind: 'c' },
    { id: 'tcv', label: 'TUNE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  leds: ['trig'],
};
