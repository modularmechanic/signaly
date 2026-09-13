import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'arp',
  name: 'ARP',
  sub: 'CLOCKED ARPEGGIATOR',
  hp: 6,
  cat: 'SEQ / CTRL',
  worklet: 'arp',
  dark: true,
  knobs: [
    { id: 'chord', label: 'CHORD', min: 0, max: 11, initial: 0, fmt: 'fChord', big: true, cvIn: 'chord' },
    { id: 'octs', label: 'OCTAVES', min: 1, max: 4, initial: 1, fmt: 'fInt', cvIn: 'oct' },
    { id: 'shape', label: 'SHAPE', min: 0, max: 3, initial: 0, fmt: 'fShape', big: true, cvIn: 'shape' },
    { id: 'glen', label: 'GATE LEN', min: 0.05, max: 1, initial: 0.6, fmt: 'fPc' },
    att('shape', 'SHAPE CV'),
    att('chord', 'CHORD CV'),
    att('oct', 'OCT CV'),
  ],
  ins: [
    { id: 'clk', label: 'CLOCK', kind: 'g' },
    { id: 'root', label: 'ROOT CV', kind: 'p' },
    { id: 'gate', label: 'HOLD', kind: 'g' },
    { id: 'shape', label: 'SHAPE CV', kind: 'c' },
    { id: 'chord', label: 'CHORD CV', kind: 'c' },
    { id: 'oct', label: 'OCT CV', kind: 'c' },
  ],
  outs: [
    { id: 'cv', label: 'CV OUT', kind: 'p' },
    { id: 'gate', label: 'GATE', kind: 'g' },
    { id: 'eoc', label: 'EOC', kind: 'g' },
  ],
  display: 'text',
};
