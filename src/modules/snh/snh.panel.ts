import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:rate', kind: 'knob', x: 0.086, y: 0.138, w: 0.357, h: 0.07, label: 'INT. RATE' },
    { id: 'knob:prob', kind: 'knob', x: 0.556, y: 0.138, w: 0.357, h: 0.07, label: 'PROB' },
    { id: 'knob:slew1', kind: 'knob', x: 0.086, y: 0.27, w: 0.357, h: 0.045, label: 'SLEW 1' },
    { id: 'knob:slew2', kind: 'knob', x: 0.556, y: 0.27, w: 0.357, h: 0.045, label: 'SLEW 2' },
    { id: 'knob:in1A', kind: 'knob', x: 0.086, y: 0.377, w: 0.357, h: 0.07, label: 'IN 1' },
    { id: 'knob:in2A', kind: 'knob', x: 0.556, y: 0.377, w: 0.357, h: 0.07, label: 'IN 2' },
    { id: 'knob:rcvA', kind: 'knob', x: 0.086, y: 0.497, w: 0.357, h: 0.07, label: 'RATE CV' },
    { id: 'knob:pcvA', kind: 'knob', x: 0.556, y: 0.497, w: 0.357, h: 0.07, label: 'PROB CV' },
    { id: 'in:rcv', kind: 'in', x: 0.211, y: 0.225, w: 0.107, h: 0.054, label: 'RATE CV' },
    { id: 'in:pcv', kind: 'in', x: 0.681, y: 0.225, w: 0.107, h: 0.054, label: 'PROB CV' },
    { id: 'in:in1', kind: 'in', x: 0.119, y: 0.663, w: 0.291, h: 0.058, label: 'IN 1' },
    { id: 'in:t1', kind: 'in', x: 0.589, y: 0.663, w: 0.291, h: 0.058, label: 'TRIG 1' },
    { id: 'in:in2', kind: 'in', x: 0.119, y: 0.747, w: 0.291, h: 0.058, label: 'IN 2' },
    { id: 'in:t2', kind: 'in', x: 0.589, y: 0.747, w: 0.291, h: 0.058, label: 'TRIG 2' },
    { id: 'out:o1', kind: 'out', x: 0.119, y: 0.831, w: 0.291, h: 0.058, label: 'OUT 1' },
    { id: 'out:o2', kind: 'out', x: 0.589, y: 0.831, w: 0.291, h: 0.058, label: 'OUT 2' },
    { id: 'out:clk', kind: 'out', x: 0.119, y: 0.915, w: 0.291, h: 0.058, label: 'INT CLK' },
    { id: 'out:nz', kind: 'out', x: 0.589, y: 0.915, w: 0.291, h: 0.058, label: 'NOISE' },
  ],
};
