import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'sdelay',
  name: 'STEREO DELAY',
  sub: 'PING-PONG · SYNC',
  hp: 16,
  cat: 'FX',
  worklet: 'sdelay',
  dark: true,
  knobs: [
    { id: 'timel', label: 'TIME L', min: 0.01, max: 3, initial: 0.375, fmt: 'fMs', curve: 'log', big: true },
    { id: 'timer', label: 'TIME R', min: 0.01, max: 3, initial: 0.5, fmt: 'fMs', curve: 'log', big: true },
    { id: 'fb', label: 'FEEDBK', min: 0, max: 0.95, initial: 0.4, fmt: 'fPc', cvIn: 'fcv' },
    { id: 'swing', label: 'SWING', min: 0, max: 0.5, initial: 0, fmt: 'fPc' },
    { id: 'tone', label: 'TONE', min: 300, max: 16000, initial: 5000, fmt: 'fHz', curve: 'log' },
    { id: 'width', label: 'WIDTH', min: 0, max: 1, initial: 0.85, fmt: 'fPc' },
    { id: 'mix', label: 'MIX', min: 0, max: 1, initial: 0.35, fmt: 'fPc', cvIn: 'mcv' },
    { id: 'tcvA', label: 'TIME CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'tcv' },
    { id: 'fcvA', label: 'FB CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'fcv' },
    { id: 'mcvA', label: 'MIX CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'mcv' },
  ],
  sws: [
    { id: 'mode', label: 'MODE', options: ['STEREO', 'PINGPONG', 'CROSS'] },
    {
      id: 'sync',
      label: 'SYNC',
      options: ['FREE', '1/1', '1/2', '1/4.', '1/4', '1/8.', '1/8', '1/8T', '1/16', '1/16T'],
    },
  ],
  ins: [
    { id: 'inl', label: 'IN L', kind: 'a' },
    { id: 'inr', label: 'IN R', kind: 'a' },
    { id: 'tcv', label: 'TIME CV', kind: 'c' },
    { id: 'fcv', label: 'FB CV', kind: 'c' },
    { id: 'mcv', label: 'MIX CV', kind: 'c' },
    { id: 'clk', label: 'CLOCK', kind: 'g' },
  ],
  outs: [
    { id: 'outl', label: 'OUT L', kind: 'a' },
    { id: 'outr', label: 'OUT R', kind: 'a' },
  ],
  leds: ['clk'],
};
