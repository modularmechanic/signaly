import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:cut', kind: 'knob', x: 0.09, y: 0.156, w: 0.82, h: 0.07, label: 'CUTOFF' },
    { id: 'in:cv', kind: 'in', x: 0.14, y: 0.251, w: 0.72, h: 0.062, label: 'FREQ CV' },
    { id: 'knob:res', kind: 'knob', x: 0.09, y: 0.338, w: 0.82, h: 0.07, label: 'RES' },
    { id: 'in:rcv', kind: 'in', x: 0.14, y: 0.433, w: 0.72, h: 0.062, label: 'RES CV' },
    { id: 'knob:drive', kind: 'knob', x: 0.09, y: 0.52, w: 0.82, h: 0.07, label: 'DRIVE' },
    { id: 'knob:cv', kind: 'knob', x: 0.09, y: 0.611, w: 0.82, h: 0.07, label: 'CV AMT' },
    { id: 'knob:rcvA', kind: 'knob', x: 0.09, y: 0.702, w: 0.82, h: 0.07, label: 'RES CV' },
    { id: 'in:in', kind: 'in', x: 0.14, y: 0.797, w: 0.72, h: 0.062, label: 'IN' },
    { id: 'out:lp', kind: 'out', x: 0.14, y: 0.888, w: 0.72, h: 0.062, label: 'LP OUT' },
  ],
};
