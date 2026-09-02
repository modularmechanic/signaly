import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:color', kind: 'knob', x: 0.06, y: 0.14, w: 0.41, h: 0.105, label: 'COLOR' },
    { id: 'knob:cut', kind: 'knob', x: 0.53, y: 0.14, w: 0.41, h: 0.105, label: 'CUTOFF' },
    { id: 'knob:dec', kind: 'knob', x: 0.06, y: 0.31, w: 0.41, h: 0.082, label: 'BURST DEC' },
    { id: 'knob:dens', kind: 'knob', x: 0.53, y: 0.31, w: 0.41, h: 0.082, label: 'DENSITY' },
    { id: 'knob:colorA', kind: 'knob', x: 0.06, y: 0.48, w: 0.41, h: 0.082, label: 'COLOR CV' },
    { id: 'knob:cutA', kind: 'knob', x: 0.53, y: 0.48, w: 0.41, h: 0.082, label: 'FILTER CV' },
    { id: 'in:gate', kind: 'in', x: 0.035, y: 0.68, w: 0.21, h: 0.072, label: 'GATE' },
    { id: 'in:color', kind: 'in', x: 0.275, y: 0.68, w: 0.21, h: 0.072, label: 'COLOR CV' },
    { id: 'in:cut', kind: 'in', x: 0.515, y: 0.68, w: 0.21, h: 0.072, label: 'FILTER CV' },
    { id: 'out:out', kind: 'out', x: 0.755, y: 0.68, w: 0.21, h: 0.072, label: 'NOISE' },
    { id: 'out:dust', kind: 'out', x: 0.035, y: 0.85, w: 0.21, h: 0.072, label: 'DUST' },
    { id: 'out:rnd', kind: 'out', x: 0.275, y: 0.85, w: 0.21, h: 0.072, label: 'RANDOM' },
    { id: 'out:burst', kind: 'out', x: 0.515, y: 0.85, w: 0.21, h: 0.072, label: 'BURST' },
  ],
};
