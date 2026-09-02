import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'display', kind: 'display', x: 0.08, y: 0.15, w: 0.84, h: 0.19 },
    { id: 'knob:thr', kind: 'knob', x: 0.154, y: 0.413, w: 0.262, h: 0.07 },
    { id: 'knob:ratio', kind: 'knob', x: 0.584, y: 0.413, w: 0.262, h: 0.07 },
    { id: 'knob:atk', kind: 'knob', x: 0.154, y: 0.51, w: 0.262, h: 0.07 },
    { id: 'knob:rel', kind: 'knob', x: 0.584, y: 0.51, w: 0.262, h: 0.07 },
    { id: 'knob:knee', kind: 'knob', x: 0.154, y: 0.607, w: 0.262, h: 0.07 },
    { id: 'knob:makeup', kind: 'knob', x: 0.584, y: 0.607, w: 0.262, h: 0.07 },
    { id: 'switch:limit', kind: 'switch', x: 0.32, y: 0.722, w: 0.36, h: 0.06 },
    { id: 'in:inl', kind: 'in', x: 0.075, y: 0.863, w: 0.19, h: 0.065 },
    { id: 'in:inr', kind: 'in', x: 0.295, y: 0.863, w: 0.19, h: 0.065 },
    { id: 'out:outl', kind: 'out', x: 0.515, y: 0.863, w: 0.19, h: 0.065 },
    { id: 'out:outr', kind: 'out', x: 0.735, y: 0.863, w: 0.19, h: 0.065 },
  ],
};
