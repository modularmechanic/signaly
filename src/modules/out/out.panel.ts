import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.06, y: 0.14, w: 0.88, h: 0.27 },
    { id: 'knob:level', kind: 'knob', x: 0.28, y: 0.49, w: 0.44, h: 0.1, label: 'LEVEL' },
    { id: 'switch:spectrum', kind: 'switch', x: 0.191, y: 0.655, w: 0.238, h: 0.06, label: 'SPECTRUM' },
    { id: 'switch:phase', kind: 'switch', x: 0.571, y: 0.655, w: 0.238, h: 0.06, label: 'PHASE' },
    { id: 'in:l', kind: 'in', x: 0.245, y: 0.863, w: 0.19, h: 0.065, label: 'IN L' },
    { id: 'in:r', kind: 'in', x: 0.565, y: 0.863, w: 0.19, h: 0.065, label: 'IN R' },
  ],
};
