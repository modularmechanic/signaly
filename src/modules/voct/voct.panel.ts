import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.08, y: 0.14, w: 0.84, h: 0.16 },
    { id: 'fader:steps', kind: 'fader', x: 0.22, y: 0.35, w: 0.56, h: 0.25, label: 'SEMITONES' },
    { id: 'knob:cvA', kind: 'knob', x: 0.2, y: 0.628, w: 0.6, h: 0.07, label: 'CV' },
    { id: 'switch:lock', kind: 'switch', x: 0.2, y: 0.715, w: 0.6, h: 0.06, label: 'OCT LOCK' },
    { id: 'in:in', kind: 'in', x: 0.34, y: 0.806, w: 0.319, h: 0.058, label: 'V/OCT IN' },
    { id: 'in:cv', kind: 'in', x: 0.34, y: 0.856, w: 0.319, h: 0.058, label: 'CV' },
    { id: 'out:out', kind: 'out', x: 0.34, y: 0.906, w: 0.319, h: 0.058, label: 'V/OCT OUT' },
  ],
};
