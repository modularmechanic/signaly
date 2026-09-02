import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:rate', kind: 'knob', x: 0.08, y: 0.15, w: 0.43, h: 0.115 },
    { id: 'knob:rcvA', kind: 'knob', x: 0.58, y: 0.145, w: 0.22, h: 0.065 },
    { id: 'in:rcv', kind: 'in', x: 0.69, y: 0.22, w: 0.22, h: 0.07 },
    { id: 'knob:depth', kind: 'knob', x: 0.08, y: 0.35, w: 0.43, h: 0.115 },
    { id: 'knob:dcvA', kind: 'knob', x: 0.58, y: 0.345, w: 0.22, h: 0.065 },
    { id: 'in:dcv', kind: 'in', x: 0.69, y: 0.42, w: 0.22, h: 0.07 },
    { id: 'knob:mix', kind: 'knob', x: 0.08, y: 0.55, w: 0.43, h: 0.115 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.58, y: 0.545, w: 0.22, h: 0.065 },
    { id: 'in:mcv', kind: 'in', x: 0.69, y: 0.62, w: 0.22, h: 0.07 },
    { id: 'in:in', kind: 'in', x: 0.055, y: 0.86, w: 0.27, h: 0.09 },
    { id: 'out:l', kind: 'out', x: 0.365, y: 0.86, w: 0.27, h: 0.09 },
    { id: 'out:r', kind: 'out', x: 0.675, y: 0.86, w: 0.27, h: 0.09 },
  ],
};
