import { describe, expect, it } from 'vitest';
import { PANEL_H, type PanelNode } from '../core/types';
import { layoutPanel } from './panel-layout';
import { allSpecs } from './registry';

/**
 * The panel is authored as `hp` and laid out by `computePanel`, and until now nothing checked that
 * the controls actually fit the width they were given. They did not: DRUM 2 packed 7 knobs, 4
 * switches and 5 jacks into 52 px and lost every knob label, while SEQ-8 spent 442 px on 6 controls.
 * These are the guards that turn "the panel looks wrong" into a failing test.
 */

/** `controls.css` deletes the knob label under this height, leaving an unnamed control. */
const LABEL_FLOOR_PX = 37;

/** Tiled neighbours share an edge, and 0.06 + 5 * 0.11 lands a whisker past 0.61 in binary
    floating point. Anything under this is a shared edge, not an overlap: 1e-6 of a 658 px
    panel is 0.0007 px. */
const EPS = 1e-6;

const overlaps = (a: PanelNode, b: PanelNode): boolean =>
  a.x + EPS < b.x + b.w && b.x + EPS < a.x + a.w && a.y + EPS < b.y + b.h && b.y + EPS < a.y + a.h;

describe('every built-in panel fits its faceplate', () => {
  for (const spec of allSpecs()) {
    const { def } = spec;

    it(`${def.id} keeps every node inside the panel`, () => {
      for (const n of layoutPanel(def).nodes) {
        expect(n.x, `${def.id} ${n.id} x`).toBeGreaterThanOrEqual(0);
        expect(n.y, `${def.id} ${n.id} y`).toBeGreaterThanOrEqual(0);
        // Clamping in computePanel means an overflowing node arrives here as a zero-height or
        // flattened box rather than an out-of-range one, so check the extent, not just the origin.
        expect(n.x + n.w, `${def.id} ${n.id} right edge`).toBeLessThanOrEqual(1.0001);
        expect(n.y + n.h, `${def.id} ${n.id} bottom edge`).toBeLessThanOrEqual(1.0001);
        expect(n.w, `${def.id} ${n.id} width`).toBeGreaterThan(0);
        expect(n.h, `${def.id} ${n.id} height`).toBeGreaterThan(0);
      }
    });

    it(`${def.id} does not overlap its own controls`, () => {
      const nodes = layoutPanel(def).nodes;
      const hits: string[] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          if (a && b && overlaps(a, b)) hits.push(`${a.id} over ${b.id}`);
        }
      }
      expect(hits, `${def.id} overlapping nodes`).toEqual([]);
    });

    it(`${def.id} gives every knob a readable row`, () => {
      const thin = layoutPanel(def)
        .nodes.filter((n) => n.kind === 'knob' || n.kind === 'fader')
        .filter((n) => n.h * PANEL_H < LABEL_FLOOR_PX)
        .map((n) => `${n.id} ${(n.h * PANEL_H).toFixed(1)}px`);
      // A module that trips this is too dense for its width: widen `hp` or drop a control.
      expect(thin, `${def.id} knob rows under ${LABEL_FLOOR_PX}px lose their label`).toEqual([]);
    });
  }
});
