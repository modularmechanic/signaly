import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'led:clk', kind: 'led', x: 0.387, y: 0.145, w: 0.226, h: 0.026, label: 'clk' },
    { id: 'knob:rate', kind: 'knob', x: 0.29, y: 0.177, w: 0.42, h: 0.07, label: 'RATE' },
    { id: 'knob:rateA', kind: 'knob', x: 0.29, y: 0.304, w: 0.42, h: 0.04, label: 'RATE CV' },
    { id: 'in:rate', kind: 'in', x: 0.376, y: 0.26, w: 0.249, h: 0.052, label: 'RATE CV' },
    { id: 'in:rst', kind: 'in', x: 0.29, y: 0.447, w: 0.42, h: 0.058, label: 'RESET' },
    { id: 'in:clk', kind: 'in', x: 0.29, y: 0.525, w: 0.42, h: 0.058, label: 'CLOCK' },
    { id: 'out:sin', kind: 'out', x: 0.29, y: 0.604, w: 0.42, h: 0.058, label: 'SIN' },
    { id: 'out:tri', kind: 'out', x: 0.29, y: 0.682, w: 0.42, h: 0.058, label: 'TRI' },
    { id: 'out:saw', kind: 'out', x: 0.29, y: 0.761, w: 0.42, h: 0.058, label: 'SAW' },
    { id: 'out:sqr', kind: 'out', x: 0.29, y: 0.839, w: 0.42, h: 0.058, label: 'SQR' },
    { id: 'out:sh', kind: 'out', x: 0.29, y: 0.918, w: 0.42, h: 0.058, label: 'S+H' },
  ],
};
