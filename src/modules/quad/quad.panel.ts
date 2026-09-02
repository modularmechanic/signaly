import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:oct', kind: 'knob', x: 0.086, y: 0.149, w: 0.357, h: 0.07, label: 'OCTAVE' },
    { id: 'knob:det', kind: 'knob', x: 0.556, y: 0.149, w: 0.357, h: 0.07, label: 'SPREAD' },
    { id: 'knob:detA', kind: 'knob', x: 0.321, y: 0.328, w: 0.357, h: 0.07, label: 'SPREAD CV' },
    { id: 'in:det', kind: 'in', x: 0.678, y: 0.276, w: 0.114, h: 0.058, label: 'SPREAD CV' },
    { id: 'switch:wave', kind: 'switch', x: 0.29, y: 0.497, w: 0.42, h: 0.06, label: 'WAVE' },
    { id: 'in:voct', kind: 'in', x: 0.119, y: 0.643, w: 0.291, h: 0.058, label: 'V/OCT' },
    { id: 'out:o1', kind: 'out', x: 0.589, y: 0.643, w: 0.291, h: 0.058, label: 'OSC 1' },
    { id: 'out:o2', kind: 'out', x: 0.119, y: 0.769, w: 0.291, h: 0.058, label: 'OSC 2' },
    { id: 'out:o3', kind: 'out', x: 0.589, y: 0.769, w: 0.291, h: 0.058, label: 'OSC 3' },
    { id: 'out:o4', kind: 'out', x: 0.119, y: 0.894, w: 0.291, h: 0.058, label: 'OSC 4' },
    { id: 'out:mix', kind: 'out', x: 0.589, y: 0.894, w: 0.291, h: 0.058, label: 'FAT MIX' },
  ],
};
