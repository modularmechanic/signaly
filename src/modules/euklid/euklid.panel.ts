import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.15, y: 0.13, w: 0.7, h: 0.35 },
    { id: 'knob:steps', kind: 'knob', x: 0.084, y: 0.514, w: 0.157, h: 0.078, label: 'STEPS' },
    { id: 'knob:fill', kind: 'knob', x: 0.309, y: 0.514, w: 0.157, h: 0.078, label: 'FILL' },
    { id: 'knob:rot', kind: 'knob', x: 0.534, y: 0.514, w: 0.157, h: 0.078, label: 'ROTATE' },
    { id: 'knob:prob', kind: 'knob', x: 0.759, y: 0.514, w: 0.157, h: 0.078, label: 'PROB' },
    { id: 'knob:chaos', kind: 'knob', x: 0.084, y: 0.639, w: 0.157, h: 0.078, label: 'CHAOS' },
    { id: 'knob:fillA', kind: 'knob', x: 0.309, y: 0.639, w: 0.157, h: 0.078, label: 'FILL CV' },
    { id: 'knob:probA', kind: 'knob', x: 0.534, y: 0.639, w: 0.157, h: 0.078, label: 'PROB CV' },
    { id: 'in:clk', kind: 'in', x: 0.104, y: 0.829, w: 0.117, h: 0.058, label: 'CLOCK' },
    { id: 'in:rst', kind: 'in', x: 0.329, y: 0.829, w: 0.117, h: 0.058, label: 'RESET' },
    { id: 'in:fill', kind: 'in', x: 0.554, y: 0.829, w: 0.117, h: 0.058, label: 'FILL CV' },
    { id: 'in:prob', kind: 'in', x: 0.779, y: 0.829, w: 0.117, h: 0.058, label: 'PROB CV' },
    { id: 'out:trig', kind: 'out', x: 0.104, y: 0.904, w: 0.117, h: 0.058, label: 'TRIG' },
    { id: 'out:inv', kind: 'out', x: 0.329, y: 0.904, w: 0.117, h: 0.058, label: 'NOT' },
    { id: 'out:acc', kind: 'out', x: 0.554, y: 0.904, w: 0.117, h: 0.058, label: 'ACCENT' },
  ],
};
