import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'led:clk', kind: 'led', x: 0.387, y: 0.146, w: 0.226, h: 0.026 },
    { id: 'knob:timel', kind: 'knob', x: 0.068, y: 0.188, w: 0.238, h: 0.07 },
    { id: 'knob:timer', kind: 'knob', x: 0.381, y: 0.188, w: 0.238, h: 0.07 },
    { id: 'knob:fb', kind: 'knob', x: 0.694, y: 0.188, w: 0.238, h: 0.07 },
    { id: 'knob:swing', kind: 'knob', x: 0.068, y: 0.319, w: 0.238, h: 0.07 },
    { id: 'knob:tone', kind: 'knob', x: 0.381, y: 0.319, w: 0.238, h: 0.07 },
    { id: 'knob:width', kind: 'knob', x: 0.694, y: 0.33, w: 0.238, h: 0.048 },
    { id: 'knob:mix', kind: 'knob', x: 0.068, y: 0.45, w: 0.238, h: 0.07 },
    { id: 'knob:tcvA', kind: 'knob', x: 0.381, y: 0.45, w: 0.238, h: 0.07 },
    { id: 'knob:fcvA', kind: 'knob', x: 0.694, y: 0.45, w: 0.238, h: 0.07 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.381, y: 0.582, w: 0.238, h: 0.07 },
    { id: 'in:fcv', kind: 'in', x: 0.778, y: 0.282, w: 0.071, h: 0.057 },
    { id: 'in:mcv', kind: 'in', x: 0.151, y: 0.544, w: 0.071, h: 0.058 },
    { id: 'switch:mode', kind: 'switch', x: 0.082, y: 0.704, w: 0.367, h: 0.06 },
    { id: 'switch:sync', kind: 'switch', x: 0.552, y: 0.704, w: 0.367, h: 0.06 },
    { id: 'in:inl', kind: 'in', x: 0.075, y: 0.819, w: 0.146, h: 0.058 },
    { id: 'in:inr', kind: 'in', x: 0.31, y: 0.819, w: 0.146, h: 0.058 },
    { id: 'in:tcv', kind: 'in', x: 0.545, y: 0.819, w: 0.146, h: 0.058 },
    { id: 'in:clk', kind: 'in', x: 0.78, y: 0.819, w: 0.146, h: 0.058 },
    { id: 'out:outl', kind: 'out', x: 0.31, y: 0.911, w: 0.146, h: 0.058 },
    { id: 'out:outr', kind: 'out', x: 0.545, y: 0.911, w: 0.146, h: 0.058 },
  ],
};
