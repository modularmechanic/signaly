import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:rate', kind: 'knob', x: 0.29, y: 0.131, w: 0.42, h: 0.07 },
    { id: 'knob:depth', kind: 'knob', x: 0.29, y: 0.238, w: 0.42, h: 0.031 },
    { id: 'knob:fb', kind: 'knob', x: 0.29, y: 0.325, w: 0.42, h: 0.031 },
    { id: 'knob:mix', kind: 'knob', x: 0.29, y: 0.411, w: 0.42, h: 0.031 },
    { id: 'knob:rcvA', kind: 'knob', x: 0.29, y: 0.498, w: 0.42, h: 0.031 },
    { id: 'knob:fcvA', kind: 'knob', x: 0.29, y: 0.565, w: 0.42, h: 0.07 },
    { id: 'knob:dcvA', kind: 'knob', x: 0.29, y: 0.652, w: 0.42, h: 0.07 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.29, y: 0.738, w: 0.42, h: 0.07 },
    { id: 'in:rcv', kind: 'in', x: 0.426, y: 0.2, w: 0.147, h: 0.045 },
    { id: 'in:dcv', kind: 'in', x: 0.426, y: 0.286, w: 0.147, h: 0.045 },
    { id: 'in:fcv', kind: 'in', x: 0.426, y: 0.373, w: 0.147, h: 0.045 },
    { id: 'in:mcv', kind: 'in', x: 0.426, y: 0.46, w: 0.147, h: 0.045 },
    { id: 'in:in', kind: 'in', x: 0.29, y: 0.864, w: 0.42, h: 0.058 },
    { id: 'out:out', kind: 'out', x: 0.29, y: 0.924, w: 0.42, h: 0.058 },
  ],
};
