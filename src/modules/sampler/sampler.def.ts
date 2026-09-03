import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'sampler',
  name: 'SAMPLER',
  sub: 'LOAD · TRIGGER · LOOP',
  hp: 12,
  cat: 'SOURCES',
  look: 'press',
  worklet: 'sampler',
  knobs: [
    { id: 'pitch', label: 'PITCH', min: -24, max: 24, initial: 0, fmt: 'fSemi', big: true },
    { id: 'start', label: 'START', min: 0, max: 1, initial: 0, fmt: 'fPc' },
    { id: 'end', label: 'END', min: 0, max: 1, initial: 1, fmt: 'fPc' },
  ],
  sws: [
    { id: 'loop', label: 'LOOP', options: ['OFF', 'ON'] },
    { id: 'reverse', label: 'REVERSE', options: ['OFF', 'ON'] },
  ],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'voct', label: 'V/OCT', kind: 'p' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: 'text',
};
