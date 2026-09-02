import type { PanelLayout } from '../../core/types';

export const panel: PanelLayout = {
  nodes: [
    { id: 'label:sub', kind: 'label', x: 0.07, y: 0.14, w: 0.86, h: 0.1, label: 'CV / GATE CONTROLLER' },
    { id: 'display', kind: 'display', x: 0.045, y: 0.275, w: 0.91, h: 0.36 },
    { id: 'out:cv', kind: 'out', x: 0.12, y: 0.79, w: 0.2, h: 0.11, label: 'V/OCT' },
    { id: 'out:gate', kind: 'out', x: 0.4, y: 0.79, w: 0.2, h: 0.11, label: 'GATE' },
    { id: 'out:trig', kind: 'out', x: 0.68, y: 0.79, w: 0.2, h: 0.11, label: 'TRIG' },
  ],
};
