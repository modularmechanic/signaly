import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.08, y: 0.12, w: 0.84, h: 0.14, label: 'TEMPO' },
    { id: 'knob:bpm', kind: 'knob', x: 0.27, y: 0.29, w: 0.46, h: 0.12, label: 'BPM' },
    { id: 'knob:r1', kind: 'knob', x: 0.1, y: 0.46, w: 0.32, h: 0.085, label: 'OUT 1' },
    { id: 'knob:r2', kind: 'knob', x: 0.58, y: 0.46, w: 0.32, h: 0.085, label: 'OUT 2' },
    { id: 'knob:r3', kind: 'knob', x: 0.1, y: 0.58, w: 0.32, h: 0.085, label: 'OUT 3' },
    { id: 'knob:r4', kind: 'knob', x: 0.58, y: 0.58, w: 0.32, h: 0.085, label: 'OUT 4' },
    { id: 'switch:run', kind: 'switch', x: 0.28, y: 0.7, w: 0.44, h: 0.075, label: 'TRANSPORT' },
    { id: 'in:rst', kind: 'in', x: 0.12, y: 0.79, w: 0.32, h: 0.07, label: 'RESET' },
    { id: 'in:ss', kind: 'in', x: 0.56, y: 0.79, w: 0.32, h: 0.07, label: 'START' },
    { id: 'out:x1', kind: 'out', x: 0.018, y: 0.9, w: 0.18, h: 0.075, label: '1' },
    { id: 'out:x2', kind: 'out', x: 0.213, y: 0.9, w: 0.18, h: 0.075, label: '2' },
    { id: 'out:d2', kind: 'out', x: 0.408, y: 0.9, w: 0.18, h: 0.075, label: '3' },
    { id: 'out:d4', kind: 'out', x: 0.603, y: 0.9, w: 0.18, h: 0.075, label: '4' },
    { id: 'out:rec', kind: 'out', x: 0.798, y: 0.9, w: 0.18, h: 0.075, label: 'REC' },
  ],
};
