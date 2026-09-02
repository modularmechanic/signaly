import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:bits', kind: 'knob', x: 0.107, y: 0.136, w: 0.786, h: 0.07 },
    { id: 'knob:rate', kind: 'knob', x: 0.136, y: 0.261, w: 0.727, h: 0.039 },
    { id: 'knob:mix', kind: 'knob', x: 0.136, y: 0.371, w: 0.727, h: 0.039 },
    { id: 'knob:bcvA', kind: 'knob', x: 0.136, y: 0.482, w: 0.727, h: 0.039 },
    { id: 'knob:rcvA', kind: 'knob', x: 0.107, y: 0.576, w: 0.786, h: 0.07 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.107, y: 0.687, w: 0.786, h: 0.07 },
    { id: 'in:bcv', kind: 'in', x: 0.266, y: 0.218, w: 0.468, h: 0.051 },
    { id: 'in:rcv', kind: 'in', x: 0.266, y: 0.328, w: 0.468, h: 0.051 },
    { id: 'in:mcv', kind: 'in', x: 0.266, y: 0.438, w: 0.468, h: 0.051 },
    { id: 'in:in', kind: 'in', x: 0.214, y: 0.841, w: 0.571, h: 0.058 },
    { id: 'out:out', kind: 'out', x: 0.214, y: 0.918, w: 0.571, h: 0.058 },
  ],
};
