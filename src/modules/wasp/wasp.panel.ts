import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:cut', kind: 'knob', x: 0.13, y: 0.14, w: 0.74, h: 0.13, label: 'CUTOFF' },
    { id: 'knob:res', kind: 'knob', x: 0.05, y: 0.34, w: 0.42, h: 0.09, label: 'RESONANCE' },
    { id: 'knob:dirt', kind: 'knob', x: 0.53, y: 0.34, w: 0.42, h: 0.09, label: 'DIRT' },
    { id: 'knob:cv', kind: 'knob', x: 0.08, y: 0.52, w: 0.4, h: 0.085, label: 'CV AMOUNT' },
    { id: 'in:cv', kind: 'in', x: 0.6, y: 0.52, w: 0.3, h: 0.07, label: 'FREQ CV' },
    { id: 'in:in', kind: 'in', x: 0.35, y: 0.69, w: 0.3, h: 0.07, label: 'AUDIO IN' },
    { id: 'out:lp', kind: 'out', x: 0.035, y: 0.86, w: 0.29, h: 0.075, label: 'LOW' },
    { id: 'out:bp', kind: 'out', x: 0.355, y: 0.86, w: 0.29, h: 0.075, label: 'BAND' },
    { id: 'out:hp', kind: 'out', x: 0.675, y: 0.86, w: 0.29, h: 0.075, label: 'HIGH' },
  ],
};
