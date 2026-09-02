import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:a1', kind: 'knob', x: 0.07, y: 0.15, w: 0.4, h: 0.12, label: 'ATT 1' },
    { id: 'knob:o1', kind: 'knob', x: 0.1, y: 0.34, w: 0.34, h: 0.09, label: 'OFFSET' },
    { id: 'knob:in1A', kind: 'knob', x: 0.13, y: 0.5, w: 0.28, h: 0.075, label: 'INPUT CV' },
    { id: 'in:in1', kind: 'in', x: 0.11, y: 0.68, w: 0.32, h: 0.075, label: 'IN 1' },
    { id: 'out:o1', kind: 'out', x: 0.11, y: 0.84, w: 0.32, h: 0.075, label: 'OUT 1' },
    { id: 'knob:a2', kind: 'knob', x: 0.53, y: 0.15, w: 0.4, h: 0.12, label: 'ATT 2' },
    { id: 'knob:o2', kind: 'knob', x: 0.56, y: 0.34, w: 0.34, h: 0.09, label: 'OFFSET' },
    { id: 'knob:in2A', kind: 'knob', x: 0.59, y: 0.5, w: 0.28, h: 0.075, label: 'INPUT CV' },
    { id: 'in:in2', kind: 'in', x: 0.57, y: 0.68, w: 0.32, h: 0.075, label: 'IN 2' },
    { id: 'out:o2', kind: 'out', x: 0.57, y: 0.84, w: 0.32, h: 0.075, label: 'OUT 2' },
  ],
};
