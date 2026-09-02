import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.12, y: 0.152, w: 0.76, h: 0.012 },
    { id: 'knob:thr', kind: 'knob', x: 0.29, y: 0.161, w: 0.42, h: 0.042 },
    { id: 'knob:atk', kind: 'knob', x: 0.29, y: 0.246, w: 0.42, h: 0.028 },
    { id: 'knob:hold', kind: 'knob', x: 0.29, y: 0.303, w: 0.42, h: 0.07 },
    { id: 'knob:rel', kind: 'knob', x: 0.29, y: 0.382, w: 0.42, h: 0.07 },
    { id: 'knob:range', kind: 'knob', x: 0.29, y: 0.46, w: 0.42, h: 0.07 },
    { id: 'knob:thrcvA', kind: 'knob', x: 0.29, y: 0.538, w: 0.42, h: 0.07 },
    { id: 'in:thrcv', kind: 'in', x: 0.429, y: 0.21, w: 0.142, h: 0.043 },
    { id: 'in:inl', kind: 'in', x: 0.29, y: 0.652, w: 0.42, h: 0.058 },
    { id: 'in:inr', kind: 'in', x: 0.29, y: 0.707, w: 0.42, h: 0.058 },
    { id: 'in:trig', kind: 'in', x: 0.29, y: 0.761, w: 0.42, h: 0.058 },
    { id: 'out:outl', kind: 'out', x: 0.29, y: 0.816, w: 0.42, h: 0.058 },
    { id: 'out:outr', kind: 'out', x: 0.29, y: 0.871, w: 0.42, h: 0.058 },
    { id: 'out:gate', kind: 'out', x: 0.29, y: 0.926, w: 0.42, h: 0.058 },
  ],
};
