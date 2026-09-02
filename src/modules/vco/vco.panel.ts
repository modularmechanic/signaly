import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'knob:oct', kind: 'knob', x: 0.06, y: 0.14, w: 0.4, h: 0.105, label: 'OCTAVE' },
    { id: 'knob:fine', kind: 'knob', x: 0.54, y: 0.15, w: 0.4, h: 0.08, label: 'FINE' },
    { id: 'knob:pw', kind: 'knob', x: 0.06, y: 0.32, w: 0.4, h: 0.08, label: 'PULSE' },
    { id: 'knob:pwmA', kind: 'knob', x: 0.54, y: 0.32, w: 0.4, h: 0.08, label: 'PWM' },
    { id: 'knob:fm', kind: 'knob', x: 0.06, y: 0.49, w: 0.4, h: 0.08, label: 'FM DEP' },
    { id: 'knob:fmA', kind: 'knob', x: 0.54, y: 0.49, w: 0.4, h: 0.08, label: 'FM CV' },
    { id: 'in:voct', kind: 'in', x: 0.035, y: 0.68, w: 0.21, h: 0.067, label: 'V/OCT' },
    { id: 'in:fm', kind: 'in', x: 0.275, y: 0.68, w: 0.21, h: 0.067, label: 'FM' },
    { id: 'in:pwm', kind: 'in', x: 0.515, y: 0.68, w: 0.21, h: 0.067, label: 'PWM' },
    { id: 'in:sync', kind: 'in', x: 0.755, y: 0.68, w: 0.21, h: 0.067, label: 'SYNC' },
    { id: 'out:sin', kind: 'out', x: 0.035, y: 0.86, w: 0.21, h: 0.067, label: 'SIN' },
    { id: 'out:tri', kind: 'out', x: 0.275, y: 0.86, w: 0.21, h: 0.067, label: 'TRI' },
    { id: 'out:saw', kind: 'out', x: 0.515, y: 0.86, w: 0.21, h: 0.067, label: 'SAW' },
    { id: 'out:sqr', kind: 'out', x: 0.755, y: 0.86, w: 0.21, h: 0.067, label: 'SQR' },
  ],
};
