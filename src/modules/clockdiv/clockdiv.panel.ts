import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'led:clk', kind: 'led', x: 0.339, y: 0.157, w: 0.321, h: 0.026, label: 'CLK' },
    { id: 'knob:div', kind: 'knob', x: 0.107, y: 0.244, w: 0.786, h: 0.153, label: 'DIVIDE' },
    { id: 'in:clk', kind: 'in', x: 0.214, y: 0.517, w: 0.571, h: 0.083, label: 'CLOCK' },
    { id: 'in:rst', kind: 'in', x: 0.214, y: 0.688, w: 0.571, h: 0.083, label: 'RESET' },
    { id: 'out:out', kind: 'out', x: 0.214, y: 0.859, w: 0.571, h: 0.083, label: '÷ OUT' },
  ],
};
