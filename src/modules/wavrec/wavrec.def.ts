import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'wavrec',
  name: 'WAV REC',
  sub: 'STEREO TAPE · WAV',
  hp: 10,
  cat: 'UTILITY',
  look: 'tape',
  worklet: 'wavrec',
  display: 'text',
  knobs: [{ id: 'gain', label: 'REC LEVEL', min: 0, max: 2, initial: 1, fmt: 'fPc' }],
  sws: [{ id: 'rec', label: 'REC', options: ['REC'], initial: 0 }],
  // Straight through, so the recorder drops in ahead of MAIN OUT without changing the patch.
  ins: [
    { id: 'l', label: 'IN L', kind: 'a' },
    { id: 'r', label: 'IN R', kind: 'a' },
  ],
  outs: [
    { id: 'l', label: 'THRU L', kind: 'a' },
    { id: 'r', label: 'THRU R', kind: 'a' },
  ],
};
