import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:g1', kind: 'knob', x: 0.09, y: 0.17, w: 0.82, h: 0.07 },
    { id: 'knob:cv1A', kind: 'knob', x: 0.06, y: 0.3, w: 0.4, h: 0.07 },
    { id: 'in:cv1', kind: 'in', x: 0.54, y: 0.306, w: 0.4, h: 0.058 },
    { id: 'in:in1', kind: 'in', x: 0.06, y: 0.436, w: 0.4, h: 0.058 },
    { id: 'out:o1', kind: 'out', x: 0.54, y: 0.436, w: 0.4, h: 0.058 },
    { id: 'switch:exp', kind: 'switch', x: 0.09, y: 0.525, w: 0.82, h: 0.06 },
    { id: 'knob:g2', kind: 'knob', x: 0.09, y: 0.625, w: 0.82, h: 0.07 },
    { id: 'knob:cv2A', kind: 'knob', x: 0.06, y: 0.75, w: 0.4, h: 0.07 },
    { id: 'in:cv2', kind: 'in', x: 0.54, y: 0.756, w: 0.4, h: 0.058 },
    { id: 'in:in2', kind: 'in', x: 0.06, y: 0.886, w: 0.4, h: 0.058 },
    { id: 'out:o2', kind: 'out', x: 0.54, y: 0.886, w: 0.4, h: 0.058 },
  ],
};
