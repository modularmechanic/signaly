import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'led:clk', kind: 'led', x: 0.387, y: 0.146, w: 0.226, h: 0.026 },
    { id: 'knob:time', kind: 'knob', x: 0.086, y: 0.188, w: 0.357, h: 0.07 },
    { id: 'knob:fb', kind: 'knob', x: 0.556, y: 0.188, w: 0.357, h: 0.07 },
    { id: 'knob:tone', kind: 'knob', x: 0.086, y: 0.33, w: 0.357, h: 0.048 },
    { id: 'knob:mix', kind: 'knob', x: 0.556, y: 0.33, w: 0.357, h: 0.048 },
    { id: 'knob:tcvA', kind: 'knob', x: 0.086, y: 0.461, w: 0.357, h: 0.048 },
    { id: 'knob:fcvA', kind: 'knob', x: 0.556, y: 0.461, w: 0.357, h: 0.048 },
    { id: 'knob:tocvA', kind: 'knob', x: 0.086, y: 0.582, w: 0.357, h: 0.07 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.556, y: 0.582, w: 0.357, h: 0.07 },
    { id: 'in:tcv', kind: 'in', x: 0.209, y: 0.282, w: 0.112, h: 0.057 },
    { id: 'in:fcv', kind: 'in', x: 0.679, y: 0.282, w: 0.112, h: 0.057 },
    { id: 'in:tocv', kind: 'in', x: 0.209, y: 0.413, w: 0.112, h: 0.057 },
    { id: 'in:mcv', kind: 'in', x: 0.679, y: 0.413, w: 0.112, h: 0.057 },
    { id: 'switch:sync', kind: 'switch', x: 0.29, y: 0.704, w: 0.42, h: 0.06 },
    { id: 'in:in', kind: 'in', x: 0.119, y: 0.819, w: 0.291, h: 0.058 },
    { id: 'in:clk', kind: 'in', x: 0.589, y: 0.819, w: 0.291, h: 0.058 },
    { id: 'out:out', kind: 'out', x: 0.354, y: 0.911, w: 0.291, h: 0.058 },
  ],
};
