import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'shift',
  name: 'SHIFT REG',
  sub: '4-STAGE ANALOG SHIFT',
  hp: 6,
  cat: 'SEQ / CTRL',
  look: 'carbon',
  worklet: 'shift',
  dark: true,
  knobs: [{ id: 'slew', label: 'SLEW', min: 0.0005, max: 0.3, initial: 0.0005, fmt: 'fMs', curve: 'log' }],
  ins: [
    { id: 'in', label: 'IN', kind: 'c' },
    { id: 'clk', label: 'CLOCK', kind: 'g' },
  ],
  outs: [
    { id: 'o1', label: 'OUT 1', kind: 'c' },
    { id: 'o2', label: 'OUT 2', kind: 'c' },
    { id: 'o3', label: 'OUT 3', kind: 'c' },
    { id: 'o4', label: 'OUT 4', kind: 'c' },
  ],
};
