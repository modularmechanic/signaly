import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:pre', kind: 'knob', x: 0.083, y: 0.185, w: 0.221, h: 0.076 },
    { id: 'knob:decay', kind: 'knob', x: 0.39, y: 0.185, w: 0.221, h: 0.076 },
    { id: 'knob:size', kind: 'knob', x: 0.696, y: 0.185, w: 0.221, h: 0.076 },
    { id: 'knob:diff', kind: 'knob', x: 0.083, y: 0.291, w: 0.221, h: 0.076 },
    { id: 'knob:inhp', kind: 'knob', x: 0.39, y: 0.291, w: 0.221, h: 0.076 },
    { id: 'knob:inlp', kind: 'knob', x: 0.696, y: 0.291, w: 0.221, h: 0.076 },
    { id: 'knob:damp', kind: 'knob', x: 0.083, y: 0.397, w: 0.221, h: 0.076 },
    { id: 'knob:lowd', kind: 'knob', x: 0.39, y: 0.397, w: 0.221, h: 0.076 },
    { id: 'knob:mrate', kind: 'knob', x: 0.696, y: 0.397, w: 0.221, h: 0.076 },
    { id: 'knob:mdep', kind: 'knob', x: 0.083, y: 0.503, w: 0.221, h: 0.076 },
    { id: 'knob:mix', kind: 'knob', x: 0.39, y: 0.503, w: 0.221, h: 0.076 },
    { id: 'knob:sizeA', kind: 'knob', x: 0.696, y: 0.503, w: 0.221, h: 0.076 },
    { id: 'knob:decayA', kind: 'knob', x: 0.083, y: 0.609, w: 0.221, h: 0.076 },
    { id: 'knob:mixA', kind: 'knob', x: 0.39, y: 0.609, w: 0.221, h: 0.076 },
    { id: 'switch:algo', kind: 'switch', x: 0.28, y: 0.717, w: 0.44, h: 0.06 },
    { id: 'in:inl', kind: 'in', x: 0.098, y: 0.831, w: 0.115, h: 0.058 },
    { id: 'in:inr', kind: 'in', x: 0.328, y: 0.831, w: 0.115, h: 0.058 },
    { id: 'in:size', kind: 'in', x: 0.558, y: 0.831, w: 0.115, h: 0.058 },
    { id: 'in:decay', kind: 'in', x: 0.788, y: 0.831, w: 0.115, h: 0.058 },
    { id: 'in:mix', kind: 'in', x: 0.098, y: 0.911, w: 0.115, h: 0.058 },
    { id: 'out:outl', kind: 'out', x: 0.328, y: 0.911, w: 0.115, h: 0.058 },
    { id: 'out:outr', kind: 'out', x: 0.558, y: 0.911, w: 0.115, h: 0.058 },
  ],
};
