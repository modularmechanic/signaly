import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'led:clk', kind: 'led', x: 0.387, y: 0.147, w: 0.226, h: 0.026 },
    { id: 'knob:time', kind: 'knob', x: 0.068, y: 0.197, w: 0.238, h: 0.07 },
    { id: 'knob:fb', kind: 'knob', x: 0.381, y: 0.197, w: 0.238, h: 0.07 },
    { id: 'knob:wow', kind: 'knob', x: 0.694, y: 0.197, w: 0.238, h: 0.07 },
    { id: 'knob:sat', kind: 'knob', x: 0.068, y: 0.351, w: 0.238, h: 0.058 },
    { id: 'knob:mix', kind: 'knob', x: 0.381, y: 0.351, w: 0.238, h: 0.058 },
    { id: 'knob:tcvA', kind: 'knob', x: 0.694, y: 0.351, w: 0.238, h: 0.058 },
    { id: 'knob:fcvA', kind: 'knob', x: 0.068, y: 0.499, w: 0.238, h: 0.058 },
    { id: 'knob:wcvA', kind: 'knob', x: 0.381, y: 0.499, w: 0.238, h: 0.058 },
    { id: 'knob:scvA', kind: 'knob', x: 0.694, y: 0.493, w: 0.238, h: 0.07 },
    { id: 'knob:mcvA', kind: 'knob', x: 0.381, y: 0.641, w: 0.238, h: 0.07 },
    { id: 'in:tcv', kind: 'in', x: 0.146, y: 0.302, w: 0.082, h: 0.058 },
    { id: 'in:fcv', kind: 'in', x: 0.459, y: 0.302, w: 0.082, h: 0.058 },
    { id: 'in:wcv', kind: 'in', x: 0.773, y: 0.302, w: 0.082, h: 0.058 },
    { id: 'in:scv', kind: 'in', x: 0.146, y: 0.45, w: 0.082, h: 0.058 },
    { id: 'in:mcv', kind: 'in', x: 0.459, y: 0.45, w: 0.082, h: 0.058 },
    { id: 'switch:sync', kind: 'switch', x: 0.29, y: 0.778, w: 0.42, h: 0.06 },
    { id: 'in:in', kind: 'in', x: 0.09, y: 0.905, w: 0.194, h: 0.058 },
    { id: 'in:clk', kind: 'in', x: 0.403, y: 0.905, w: 0.194, h: 0.058 },
    { id: 'out:out', kind: 'out', x: 0.716, y: 0.905, w: 0.194, h: 0.058 },
  ],
};
