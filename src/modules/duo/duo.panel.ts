import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:oct', kind: 'knob', x: 0.07, y: 0.13, w: 0.4, h: 0.1, label: 'OCTAVE' },
    { id: 'knob:semi', kind: 'knob', x: 0.53, y: 0.13, w: 0.4, h: 0.1, label: 'INTERVAL' },
    { id: 'switch:w1', kind: 'switch', x: 0.07, y: 0.27, w: 0.4, h: 0.065, label: 'OSC 1 WAVE' },
    { id: 'switch:w2', kind: 'switch', x: 0.53, y: 0.27, w: 0.4, h: 0.065, label: 'OSC 2 WAVE' },
    { id: 'knob:det', kind: 'knob', x: 0.08, y: 0.38, w: 0.36, h: 0.085, label: 'DETUNE' },
    { id: 'knob:fmA', kind: 'knob', x: 0.56, y: 0.38, w: 0.36, h: 0.085, label: 'FM DEPTH' },
    { id: 'knob:mix', kind: 'knob', x: 0.08, y: 0.51, w: 0.36, h: 0.095, label: 'OSC MIX' },
    { id: 'knob:mixA', kind: 'knob', x: 0.56, y: 0.51, w: 0.36, h: 0.085, label: 'MIX CV' },
    { id: 'switch:sync', kind: 'switch', x: 0.32, y: 0.64, w: 0.36, h: 0.06, label: 'SYNC' },
    { id: 'in:voct', kind: 'in', x: 0.04, y: 0.75, w: 0.28, h: 0.07, label: 'V/OCT' },
    { id: 'in:fm', kind: 'in', x: 0.36, y: 0.75, w: 0.28, h: 0.07, label: 'FM' },
    { id: 'in:mix', kind: 'in', x: 0.68, y: 0.75, w: 0.28, h: 0.07, label: 'MIX CV' },
    { id: 'out:o1', kind: 'out', x: 0.04, y: 0.87, w: 0.28, h: 0.07, label: 'OSC 1' },
    { id: 'out:o2', kind: 'out', x: 0.36, y: 0.87, w: 0.28, h: 0.07, label: 'OSC 2' },
    { id: 'out:mix', kind: 'out', x: 0.68, y: 0.87, w: 0.28, h: 0.07, label: 'MIX' },
  ],
};
