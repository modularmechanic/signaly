import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:inA', kind: 'knob', x: 0.29, y: 0.159, w: 0.42, h: 0.107 },
    { id: 'in:in', kind: 'in', x: 0.29, y: 0.374, w: 0.42, h: 0.058 },
    { id: 'out:o1', kind: 'out', x: 0.29, y: 0.503, w: 0.42, h: 0.058 },
    { id: 'out:o2', kind: 'out', x: 0.29, y: 0.633, w: 0.42, h: 0.058 },
    { id: 'out:o3', kind: 'out', x: 0.29, y: 0.763, w: 0.42, h: 0.058 },
    { id: 'out:o4', kind: 'out', x: 0.29, y: 0.892, w: 0.42, h: 0.058 },
  ],
};
