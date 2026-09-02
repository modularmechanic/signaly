import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:freq', kind: 'knob', x: 0.14, y: 0.14, w: 0.72, h: 0.105, label: 'FREQ' },
    { id: 'knob:fb', kind: 'knob', x: 0.14, y: 0.29, w: 0.72, h: 0.082, label: 'FDBK' },
    { id: 'knob:damp', kind: 'knob', x: 0.14, y: 0.43, w: 0.72, h: 0.082, label: 'DAMP' },
    { id: 'knob:mix', kind: 'knob', x: 0.14, y: 0.57, w: 0.72, h: 0.082, label: 'MIX' },
    { id: 'in:in', kind: 'in', x: 0.2, y: 0.72, w: 0.6, h: 0.067, label: 'IN' },
    { id: 'in:voct', kind: 'in', x: 0.2, y: 0.81, w: 0.6, h: 0.067, label: 'V/OCT' },
    { id: 'out:out', kind: 'out', x: 0.2, y: 0.9, w: 0.6, h: 0.067, label: 'OUT' },
  ],
};
