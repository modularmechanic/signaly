import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'rvsdelay',
  name: 'REVERSE',
  sub: 'REVERSE DELAY',
  hp: 6,
  cat: 'FX',
  look: 'noir',
  worklet: 'rvsdelay',
  knobs: [
    { id: 'time', label: 'CHUNK', min: 0.03, max: 1, initial: 0.3, fmt: 'fMs', curve: 'log', big: true },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.7, fmt: 'fPc' },
  ],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'clk', label: 'CLOCK', kind: 'g' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
};
