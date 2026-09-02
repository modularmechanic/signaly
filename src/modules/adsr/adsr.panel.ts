import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.13, y: 0.14, w: 0.74, h: 0.1, label: 'ENVELOPE' },
    { id: 'knob:a', kind: 'knob', x: 0.295, y: 0.314, w: 0.41, h: 0.07, label: 'ATTACK' },
    { id: 'knob:d', kind: 'knob', x: 0.295, y: 0.431, w: 0.41, h: 0.07, label: 'DECAY' },
    { id: 'knob:s', kind: 'knob', x: 0.295, y: 0.549, w: 0.41, h: 0.07, label: 'SUSTAIN' },
    { id: 'knob:r', kind: 'knob', x: 0.295, y: 0.666, w: 0.41, h: 0.07, label: 'RELEASE' },
    { id: 'in:gate', kind: 'in', x: 0.34, y: 0.806, w: 0.319, h: 0.058, label: 'GATE' },
    { id: 'out:out', kind: 'out', x: 0.34, y: 0.856, w: 0.319, h: 0.058, label: 'ENV' },
    { id: 'out:inv', kind: 'out', x: 0.34, y: 0.906, w: 0.319, h: 0.058, label: 'INV' },
  ],
};
