import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'chorus',
  name: 'CHORUS',
  sub: 'STEREO BBD ENSEMBLE',
  hp: 6,
  cat: 'FX',
  look: 'ether',
  worklet: 'chorus',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.05, max: 5, initial: 0.5, fmt: 'fHz', curve: 'log', cvIn: 'rcv' },
    { id: 'depth', label: 'DEPTH', min: 0, max: 1, initial: 0.5, fmt: 'fPc', cvIn: 'dcv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc', cvIn: 'mcv' },
    att('rcv', 'RATE CV'),
    att('dcv', 'DEPTH CV'),
    att('mcv', 'MIX CV'),
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'rcv', label: 'RATE CV', kind: 'c' },
    { id: 'dcv', label: 'DEPTH CV', kind: 'c' },
    { id: 'mcv', label: 'MIX CV', kind: 'c' },
  ],
  outs: [
    { id: 'l', label: 'OUT L', kind: 'a' },
    { id: 'r', label: 'OUT R', kind: 'a' },
  ],
};
