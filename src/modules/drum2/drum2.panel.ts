import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'switch:mode', kind: 'switch', x: 0.143, y: 0.19, w: 0.714, h: 0.06, label: 'MODE' },
    { id: 'knob:tone', kind: 'knob', x: 0.107, y: 0.257, w: 0.786, h: 0.07, label: 'TONE' },
    { id: 'knob:snap', kind: 'knob', x: 0.107, y: 0.323, w: 0.786, h: 0.07, label: 'SNAP' },
    { id: 'knob:click', kind: 'knob', x: 0.107, y: 0.389, w: 0.786, h: 0.07, label: 'CLICK' },
    { id: 'knob:length', kind: 'knob', x: 0.107, y: 0.455, w: 0.786, h: 0.07, label: 'LENGTH' },
    { id: 'knob:pitch', kind: 'knob', x: 0.107, y: 0.521, w: 0.786, h: 0.07, label: 'PITCH' },
    { id: 'knob:resonance', kind: 'knob', x: 0.107, y: 0.587, w: 0.786, h: 0.07, label: 'RESONANCE' },
    { id: 'knob:adsr', kind: 'knob', x: 0.107, y: 0.653, w: 0.786, h: 0.07, label: 'ADSR' },
    { id: 'in:trig', kind: 'in', x: 0.032, y: 0.754, w: 0.367, h: 0.048, label: 'TRIG' },
    { id: 'in:pitch_cv', kind: 'in', x: 0.346, y: 0.75, w: 0.308, h: 0.054, label: 'V/OCT' },
    { id: 'in:sample_in', kind: 'in', x: 0.601, y: 0.754, w: 0.367, h: 0.048, label: 'SAMPLE IN' },
    { id: 'out:out', kind: 'out', x: 0.136, y: 0.88, w: 0.395, h: 0.054, label: 'OUT' },
    { id: 'out:env', kind: 'out', x: 0.47, y: 0.88, w: 0.395, h: 0.054, label: 'ENV' },
  ],
};
