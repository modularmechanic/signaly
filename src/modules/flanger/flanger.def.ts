import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'flanger',
  name: 'FLANGER',
  sub: 'THRU-ZERO-ISH',
  hp: 8,
  cat: 'FX',
  look: 'arc',
  worklet: 'flanger',
  knobs: [
    { id: 'rate', label: 'RATE', min: 0.02, max: 4, initial: 0.25, fmt: 'fHz', curve: 'log', cvIn: 'rcv' },
    { id: 'depth', label: 'DEPTH', min: 0, max: 1, initial: 0.7, fmt: 'fPc', cvIn: 'dcv' },
    { id: 'fb', label: 'FEEDBK', min: -0.95, max: 0.95, initial: 0.5, fmt: 'f1', cvIn: 'fcv' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.5, fmt: 'fPc', cvIn: 'mcv' },
    att('rcv', 'RATE CV'),
    att('fcv', 'FB CV'),
    att('dcv', 'DEPTH CV'),
    att('mcv', 'MIX CV'),
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'rcv', label: 'RATE CV', kind: 'c' },
    { id: 'fcv', label: 'FB CV', kind: 'c' },
    { id: 'dcv', label: 'DEPTH CV', kind: 'c' },
    { id: 'mcv', label: 'MIX CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
