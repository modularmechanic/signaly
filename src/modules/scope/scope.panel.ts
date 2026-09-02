import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.055, y: 0.14, w: 0.89, h: 0.34 },
    { id: 'knob:time', kind: 'knob', x: 0.053, y: 0.558, w: 0.157, h: 0.084, label: 'TIME' },
    { id: 'knob:scale1', kind: 'knob', x: 0.237, y: 0.558, w: 0.157, h: 0.084, label: 'A GAIN' },
    { id: 'knob:scale2', kind: 'knob', x: 0.421, y: 0.558, w: 0.157, h: 0.084, label: 'B GAIN' },
    { id: 'knob:scale3', kind: 'knob', x: 0.605, y: 0.558, w: 0.157, h: 0.084, label: 'C GAIN' },
    { id: 'knob:scale4', kind: 'knob', x: 0.789, y: 0.558, w: 0.157, h: 0.084, label: 'D GAIN' },
    { id: 'switch:mode', kind: 'switch', x: 0.34, y: 0.702, w: 0.32, h: 0.06, label: 'MODE' },
    { id: 'in:in1', kind: 'in', x: 0.098, y: 0.826, w: 0.114, h: 0.058, label: 'IN 1' },
    { id: 'out:thru1', kind: 'out', x: 0.328, y: 0.826, w: 0.114, h: 0.058, label: 'THRU 1' },
    { id: 'in:in2', kind: 'in', x: 0.558, y: 0.826, w: 0.114, h: 0.058, label: 'IN 2' },
    { id: 'out:thru2', kind: 'out', x: 0.788, y: 0.826, w: 0.114, h: 0.058, label: 'THRU 2' },
    { id: 'in:in3', kind: 'in', x: 0.098, y: 0.896, w: 0.114, h: 0.058, label: 'IN 3' },
    { id: 'out:thru3', kind: 'out', x: 0.328, y: 0.896, w: 0.114, h: 0.058, label: 'THRU 3' },
    { id: 'in:in4', kind: 'in', x: 0.558, y: 0.896, w: 0.114, h: 0.058, label: 'IN 4' },
    { id: 'out:thru4', kind: 'out', x: 0.788, y: 0.896, w: 0.114, h: 0.058, label: 'THRU 4' },
  ],
};
