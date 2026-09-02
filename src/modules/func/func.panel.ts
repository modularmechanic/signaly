import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.12, y: 0.154, w: 0.76, h: 0.023, label: 'SLOPE / SLEW / LFO' },
    { id: 'knob:rise', kind: 'knob', x: 0.29, y: 0.172, w: 0.42, h: 0.062, label: 'RISE' },
    { id: 'knob:fall', kind: 'knob', x: 0.29, y: 0.251, w: 0.42, h: 0.07, label: 'FALL' },
    { id: 'knob:inA', kind: 'knob', x: 0.29, y: 0.335, w: 0.42, h: 0.07, label: 'SIGNAL' },
    { id: 'switch:cycle', kind: 'switch', x: 0.29, y: 0.443, w: 0.42, h: 0.06, label: 'CYCLE' },
    { id: 'in:trig', kind: 'in', x: 0.29, y: 0.599, w: 0.42, h: 0.058, label: 'TRIG' },
    { id: 'in:in', kind: 'in', x: 0.29, y: 0.702, w: 0.42, h: 0.058, label: 'SIGNAL' },
    { id: 'out:out', kind: 'out', x: 0.29, y: 0.804, w: 0.42, h: 0.058, label: 'OUT' },
    { id: 'out:eoc', kind: 'out', x: 0.29, y: 0.906, w: 0.42, h: 0.058, label: 'EOC' },
  ],
};
