import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'snh',
  name: 'S + H LAB',
  sub: 'DUAL SAMPLE & HOLD',
  hp: 10,
  cat: 'ENV / FUNC',
  look: 'lab',
  worklet: 'snh',
  knobs: [
    {
      id: 'rate',
      label: 'INT. RATE',
      min: 0.05,
      max: 200,
      initial: 8,
      fmt: 'fHz',
      curve: 'log',
      cvIn: 'rcv',
    },
    { id: 'prob', label: 'PROB', min: 0, max: 1, initial: 1, fmt: 'fPc', cvIn: 'pcv' },
    { id: 'slew1', label: 'SLEW 1', min: 0.0005, max: 0.3, initial: 0.001, fmt: 'fMs', curve: 'log' },
    { id: 'slew2', label: 'SLEW 2', min: 0.0005, max: 0.3, initial: 0.001, fmt: 'fMs', curve: 'log' },
    att('in1', 'IN 1'),
    att('in2', 'IN 2'),
    att('rcv', 'RATE CV'),
    att('pcv', 'PROB CV'),
  ],
  ins: [
    { id: 'in1', label: 'IN 1', kind: 'c' },
    { id: 't1', label: 'TRIG 1', kind: 'g' },
    { id: 'in2', label: 'IN 2', kind: 'c' },
    { id: 't2', label: 'TRIG 2', kind: 'g' },
    { id: 'rcv', label: 'RATE CV', kind: 'c' },
    { id: 'pcv', label: 'PROB CV', kind: 'c' },
  ],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'c' },
    { id: 'o2', label: 'OUT 2', kind: 'c' },
    { id: 'clk', label: 'INT CLK', kind: 'g' },
    { id: 'nz', label: 'NOISE', kind: 'c' },
  ],
};
