import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.05, y: 0.12, w: 0.9, h: 0.5 },
    { id: 'knob:len', kind: 'knob', x: 0.08, y: 0.69, w: 0.15, h: 0.07, label: 'STEPS' },
    { id: 'knob:glide', kind: 'knob', x: 0.31, y: 0.69, w: 0.15, h: 0.07, label: 'GLIDE' },
    { id: 'in:clk', kind: 'in', x: 0.05, y: 0.854, w: 0.11, h: 0.058, label: 'CLOCK' },
    { id: 'in:rst', kind: 'in', x: 0.2, y: 0.854, w: 0.11, h: 0.058, label: 'RESET' },
    { id: 'out:cv', kind: 'out', x: 0.68, y: 0.854, w: 0.11, h: 0.058, label: 'CV OUT' },
    { id: 'out:gate', kind: 'out', x: 0.84, y: 0.854, w: 0.11, h: 0.058, label: 'GATE' },
  ],
};
