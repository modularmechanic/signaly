import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'drum2',
  name: 'DRUM 2',
  sub: 'TRANSIENT VOICE',
  hp: 8,
  cat: 'DRUMS',
  worklet: 'drum2',
  dark: true,
  knobs: [
    { id: 'tone', label: 'TONE', min: 0, max: 1, initial: 0.55, fmt: 'fPc' },
    { id: 'snap', label: 'SNAP', min: 0, max: 1, initial: 0.4, fmt: 'fPc' },
    { id: 'click', label: 'CLICK', min: 0, max: 1, initial: 0.35, fmt: 'fPc' },
    { id: 'length', label: 'LENGTH', min: 0.02, max: 2, initial: 0.35, fmt: 'fMs', curve: 'log' },
    { id: 'pitch', label: 'PITCH', min: -2, max: 2, initial: 0, fmt: 'f1' },
    { id: 'resonance', label: 'RESONANCE', min: 0, max: 1, initial: 0.5, fmt: 'fPc' },
    { id: 'adsr', label: 'ADSR', min: 0, max: 1, initial: 0.4, fmt: 'fPc' },
  ],
  sws: [{ id: 'mode', label: 'MODE', options: ['KICK', 'SNARE', 'HH', 'CRSH', 'SAMPLE'] }],
  ins: [
    { id: 'trig', label: 'TRIG', kind: 'g' },
    { id: 'pitch_cv', label: 'V/OCT', kind: 'p' },
    { id: 'sample_in', label: 'SAMPLE IN', kind: 'a' },
  ],
  outs: [
    { id: 'out', label: 'OUT', kind: 'a' },
    { id: 'env', label: 'ENV', kind: 'c' },
  ],
};
