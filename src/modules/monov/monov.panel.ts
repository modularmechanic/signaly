import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:glide', kind: 'knob', x: 0.07, y: 0.13, w: 0.38, h: 0.078 },
    { id: 'switch:wave', kind: 'switch', x: 0.55, y: 0.145, w: 0.36, h: 0.06 },
    { id: 'knob:cut', kind: 'knob', x: 0.07, y: 0.27, w: 0.38, h: 0.105 },
    { id: 'knob:res', kind: 'knob', x: 0.55, y: 0.28, w: 0.38, h: 0.078 },
    { id: 'knob:env', kind: 'knob', x: 0.07, y: 0.42, w: 0.38, h: 0.078 },
    { id: 'knob:fcv', kind: 'knob', x: 0.55, y: 0.42, w: 0.38, h: 0.078 },
    { id: 'knob:a', kind: 'knob', x: 0.025, y: 0.57, w: 0.215, h: 0.075 },
    { id: 'knob:d', kind: 'knob', x: 0.27, y: 0.57, w: 0.215, h: 0.075 },
    { id: 'knob:s', kind: 'knob', x: 0.515, y: 0.57, w: 0.215, h: 0.075 },
    { id: 'knob:r', kind: 'knob', x: 0.76, y: 0.57, w: 0.215, h: 0.075 },
    { id: 'knob:accA', kind: 'knob', x: 0.31, y: 0.7, w: 0.38, h: 0.078 },
    { id: 'in:voct', kind: 'in', x: 0.035, y: 0.82, w: 0.21, h: 0.062 },
    { id: 'in:gate', kind: 'in', x: 0.275, y: 0.82, w: 0.21, h: 0.062 },
    { id: 'in:fcv', kind: 'in', x: 0.515, y: 0.82, w: 0.21, h: 0.062 },
    { id: 'in:acc', kind: 'in', x: 0.755, y: 0.82, w: 0.21, h: 0.062 },
    { id: 'out:out', kind: 'out', x: 0.22, y: 0.91, w: 0.21, h: 0.062 },
    { id: 'out:env', kind: 'out', x: 0.58, y: 0.91, w: 0.21, h: 0.062 },
  ],
};
