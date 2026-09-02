import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.12, y: 0.221, w: 0.76, h: 0.2, label: 'CV + LEVEL' },
    { id: 'knob:inA', kind: 'knob', x: 0.107, y: 0.502, w: 0.786, h: 0.123, label: 'IN' },
    { id: 'in:in', kind: 'in', x: 0.214, y: 0.738, w: 0.571, h: 0.065, label: 'IN' },
    { id: 'out:thru', kind: 'out', x: 0.214, y: 0.882, w: 0.571, h: 0.065, label: 'THRU' },
  ],
};
