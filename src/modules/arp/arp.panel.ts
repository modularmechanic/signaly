import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.07, y: 0.12, w: 0.86, h: 0.16, label: 'ARP PATTERN' },
    { id: 'knob:shape', kind: 'knob', x: 0.08, y: 0.32, w: 0.44, h: 0.09, label: 'SHAPE' },
    { id: 'in:shape', kind: 'in', x: 0.67, y: 0.325, w: 0.22, h: 0.08, label: 'CV' },
    { id: 'knob:chord', kind: 'knob', x: 0.08, y: 0.44, w: 0.44, h: 0.09, label: 'CHORD' },
    { id: 'in:chord', kind: 'in', x: 0.67, y: 0.445, w: 0.22, h: 0.08, label: 'CV' },
    { id: 'knob:octs', kind: 'knob', x: 0.08, y: 0.56, w: 0.44, h: 0.09, label: 'OCTAVES' },
    { id: 'in:oct', kind: 'in', x: 0.67, y: 0.565, w: 0.22, h: 0.08, label: 'CV' },
    { id: 'knob:glen', kind: 'knob', x: 0.08, y: 0.68, w: 0.36, h: 0.06, label: 'GATE LEN' },
    { id: 'knob:shapeA', kind: 'knob', x: 0.54, y: 0.68, w: 0.36, h: 0.06, label: 'SHAPE CV' },
    { id: 'knob:chordA', kind: 'knob', x: 0.08, y: 0.755, w: 0.36, h: 0.06, label: 'CHORD CV' },
    { id: 'knob:octA', kind: 'knob', x: 0.54, y: 0.755, w: 0.36, h: 0.06, label: 'OCT CV' },
    { id: 'in:clk', kind: 'in', x: 0.055, y: 0.835, w: 0.27, h: 0.065, label: 'CLOCK' },
    { id: 'in:root', kind: 'in', x: 0.365, y: 0.835, w: 0.27, h: 0.065, label: 'ROOT' },
    { id: 'in:gate', kind: 'in', x: 0.675, y: 0.835, w: 0.27, h: 0.065, label: 'HOLD' },
    { id: 'out:cv', kind: 'out', x: 0.055, y: 0.92, w: 0.27, h: 0.06, label: 'CV' },
    { id: 'out:gate', kind: 'out', x: 0.365, y: 0.92, w: 0.27, h: 0.06, label: 'GATE' },
    { id: 'out:eoc', kind: 'out', x: 0.675, y: 0.92, w: 0.27, h: 0.06, label: 'EOC' },
  ],
};
