import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:vowel', kind: 'knob', x: 0.09, y: 0.178, w: 0.82, h: 0.07, label: 'A·E·I·O·U' },
    { id: 'in:cv', kind: 'in', x: 0.14, y: 0.318, w: 0.72, h: 0.064, label: 'VOWEL CV' },
    { id: 'knob:res', kind: 'knob', x: 0.09, y: 0.452, w: 0.82, h: 0.07, label: 'RES' },
    { id: 'knob:cv', kind: 'knob', x: 0.09, y: 0.588, w: 0.82, h: 0.07, label: 'VOWEL CV' },
    { id: 'in:in', kind: 'in', x: 0.14, y: 0.728, w: 0.72, h: 0.064, label: 'IN' },
    { id: 'out:out', kind: 'out', x: 0.14, y: 0.865, w: 0.72, h: 0.064, label: 'OUT' },
  ],
};
