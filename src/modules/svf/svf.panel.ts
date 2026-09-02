import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:cut', kind: 'knob', x: 0.09, y: 0.151, w: 0.82, h: 0.07, label: 'CUTOFF' },
    { id: 'in:cv', kind: 'in', x: 0.14, y: 0.239, w: 0.72, h: 0.058, label: 'FREQ CV' },
    { id: 'knob:res', kind: 'knob', x: 0.09, y: 0.315, w: 0.82, h: 0.07, label: 'RES' },
    { id: 'in:rcv', kind: 'in', x: 0.14, y: 0.403, w: 0.72, h: 0.058, label: 'RES CV' },
    { id: 'knob:cv', kind: 'knob', x: 0.09, y: 0.479, w: 0.82, h: 0.07, label: 'CV AMT' },
    { id: 'knob:rcvamt', kind: 'knob', x: 0.09, y: 0.561, w: 0.82, h: 0.07, label: 'RES CV' },
    { id: 'in:in', kind: 'in', x: 0.14, y: 0.649, w: 0.72, h: 0.058, label: 'IN' },
    { id: 'out:lp', kind: 'out', x: 0.14, y: 0.731, w: 0.72, h: 0.058, label: 'LP' },
    { id: 'out:bp', kind: 'out', x: 0.14, y: 0.813, w: 0.72, h: 0.058, label: 'BP' },
    { id: 'out:hp', kind: 'out', x: 0.14, y: 0.895, w: 0.72, h: 0.058, label: 'HP' },
  ],
};
