import type { ModuleDef, PanelNode } from '../../core/types';

// Authored geometry: the computed layout gives a display a fifth of the panel, which makes the
// valve a thumbnail. Here it stands half the panel tall down the left, the drive section beside
// it, output stage and jacks below — the way a valve sits on an amplifier chassis.
const box = (id: string, kind: PanelNode['kind'], x: number, y: number, w: number, h: number): PanelNode => ({
  id,
  kind,
  x,
  y,
  w,
  h,
});
const nodes: PanelNode[] = [
  box('display:text', 'display', 0.02, 0.115, 0.56, 0.5),
  box('knob:drive', 'knob', 0.6, 0.115, 0.38, 0.175),
  box('knob:bias', 'knob', 0.6, 0.3, 0.38, 0.085),
  box('knob:sag', 'knob', 0.6, 0.395, 0.38, 0.085),
  box('knob:tone', 'knob', 0.6, 0.49, 0.38, 0.085),
  box('knob:level', 'knob', 0.02, 0.625, 0.28, 0.085),
  box('knob:dcvA', 'knob', 0.3, 0.625, 0.28, 0.085),
  box('switch:type', 'switch', 0.6, 0.625, 0.38, 0.085),
  box('in:in', 'in', 0.02, 0.78, 0.3, 0.1),
  box('in:dcv', 'in', 0.34, 0.78, 0.3, 0.1),
  box('out:out', 'out', 0.66, 0.88, 0.3, 0.1),
];

export const def: ModuleDef = {
  id: 'tube',
  name: 'TUBE',
  sub: '12AX7 · 12AU7 · EL34 · KT88',
  hp: 8,
  cat: 'FX',
  look: 'stage',
  worklet: 'tube',
  dark: true,
  display: 'text',
  knobs: [
    {
      id: 'drive',
      label: 'DRIVE',
      min: 0.5,
      max: 15,
      initial: 3,
      fmt: 'f1',
      curve: 'log',
      big: true,
      cvIn: 'dcv',
    },
    { id: 'bias', label: 'BIAS', min: -1, max: 1, initial: 0, fmt: 'f1' },
    { id: 'sag', label: 'SAG', min: 0, max: 1, initial: 0.3, fmt: 'fPc' },
    { id: 'tone', label: 'TONE', min: 400, max: 16000, initial: 6000, fmt: 'fHz', curve: 'log' },
    { id: 'level', label: 'LEVEL', min: 0, max: 1.2, initial: 0.8, fmt: 'fPc' },
    { id: 'dcvA', label: 'DRIVE CV', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'dcv' },
  ],
  sws: [{ id: 'type', label: 'TYPE', options: ['12AX7', '12AU7', '6L6', 'EL34', 'KT88'] }],
  ins: [
    { id: 'in', label: 'IN', kind: 'a' },
    { id: 'dcv', label: 'DRIVE CV', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  panel: { nodes },
};
