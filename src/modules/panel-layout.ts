import {
  HP_PX,
  type JackDef,
  type KnobDef,
  type ModuleDef,
  type PanelLayout,
  type PanelNode,
  type PanelNodeKind,
} from '../core/types';

export const HEADER_H = 0.09;
export const HEADER_GAP = 0.02;
export const JACK_ROW_H = 0.1;
export const JACK_GAP = 0.02;
const SW_ROW_H = 0.075;
const LED_ROW_H = 0.05;
const LED_W = 0.12;
const DISPLAY_GAP = 0.01;
export const BOTTOM_PAD = 0.018;
const ROW_MAX = 0.15;
const BIG_ROW = 1.27;

const cache = new Map<string, PanelLayout>();

const clamp = (n: number, lo: number, hi: number): number => (n < lo ? lo : n > hi ? hi : n);

const panelPad = (hp: number): number => (hp <= 3 ? 0.03 : 0.06);

/** Jacks per row for an `hp`-wide panel — the density check in user-module validation
    needs the same number computePanel lays out with. */
export const jackColsFor = (hp: number): number =>
  clamp(Math.floor((hp * HP_PX * (1 - 2 * panelPad(hp))) / 43), 1, 8);

/** Authored geometry wins; every built-in and any user module without `panel` gets this. */
export function layoutPanel(def: ModuleDef): PanelLayout {
  if (def.panel) return def.panel;
  const hit = cache.get(def.id);
  if (hit) return hit;
  const computed = computePanel(def);
  cache.set(def.id, computed);
  return computed;
}

/** Drop a memoised layout (a user module was re-authored under the same id). */
export function forgetPanel(id: string): void {
  cache.delete(id);
}

/** Lay `items` out in rows of `perRow`. `span` returns 0 for a normal cell, or the
    row-height multiplier for an item that takes the whole usable width. */
function grid<T>(
  nodes: PanelNode[],
  items: readonly T[],
  perRow: number,
  top: number,
  rowH: number,
  box: { pad: number; usable: number },
  make: (item: T) => { id: string; kind: PanelNodeKind; label?: string },
  span?: (item: T) => number,
): number {
  let y = top;
  let col = 0;
  for (const item of items) {
    const k = span?.(item) ?? 0;
    if (k && col > 0) {
      y += rowH;
      col = 0;
    }
    nodes.push({
      ...make(item),
      x: box.pad + (k ? 0 : (col * box.usable) / perRow),
      y,
      w: k ? box.usable : box.usable / perRow,
      h: k ? rowH * k : rowH,
    });
    if (k) {
      y += rowH * k;
      col = 0;
    } else if (++col === perRow) {
      y += rowH;
      col = 0;
    }
  }
  return col > 0 ? y + rowH : y;
}

function gridRows<T>(items: readonly T[], perRow: number, span?: (item: T) => number): number {
  let rows = 0;
  let col = 0;
  for (const item of items) {
    if (span?.(item)) {
      if (col > 0) {
        rows++;
        col = 0;
      }
      rows++;
    } else if (++col === perRow) {
      rows++;
      col = 0;
    }
  }
  return rows + (col > 0 ? 1 : 0);
}

/** Total row height in units of a small row — a big knob's row is BIG_ROW times taller. */
function knobWeight(knobs: readonly KnobDef[], cols: number): number {
  let w = 0;
  let col = 0;
  for (const k of knobs) {
    if (k.big) {
      if (col > 0) {
        w++;
        col = 0;
      }
      w += BIG_ROW;
    } else if (++col === cols) {
      w++;
      col = 0;
    }
  }
  return w + (col > 0 ? 1 : 0);
}

function computePanel(def: ModuleDef): PanelLayout {
  const pad = panelPad(def.hp);
  const box = { pad, usable: 1 - 2 * pad };
  const usablePx = def.hp * HP_PX * box.usable;
  const cols = clamp(Math.floor(usablePx / 66), 1, 4);
  const jackCols = jackColsFor(def.hp);
  const swCols = def.hp < 10 ? Math.min(cols, 2) : cols;
  const sws = def.sws ?? [];
  const leds = def.leds ?? [];
  // >3 options, or a trough whose legends cannot fit one switch column, takes the whole row
  const spanSw = (s: { options: string[] }): number =>
    s.options.length > 3 || s.options.reduce((n, o) => n + o.length * 7.1 + 6, 6) > usablePx / swCols ? 1 : 0;
  // The header band (0..HEADER_H) is reserved for <ModuleHeader>; no node is emitted for it.
  const nodes: PanelNode[] = [];

  const jacksH = (Math.ceil(def.ins.length / jackCols) + Math.ceil(def.outs.length / jackCols)) * JACK_ROW_H;
  const swH = gridRows(sws, swCols, spanSw) * SW_ROW_H;
  const ledH = leds.length ? LED_ROW_H : 0;
  const displayH = def.display ? (def.hp >= 6 ? 0.2 : 0.16) + DISPLAY_GAP : 0;
  const weighted = knobWeight(def.knobs, cols);
  const knobsH = Math.max(
    0,
    1 - HEADER_H - HEADER_GAP - swH - ledH - displayH - jacksH - JACK_GAP - BOTTOM_PAD,
  );

  let y = HEADER_H + HEADER_GAP;
  if (weighted > 0) {
    y = grid(
      nodes,
      def.knobs,
      cols,
      y,
      Math.min(ROW_MAX, knobsH / weighted),
      box,
      (k) => ({
        id: `${k.fader ? 'fader' : 'knob'}:${k.id}`,
        kind: k.fader ? 'fader' : 'knob',
        label: k.label,
      }),
      (k) => (k.big ? BIG_ROW : 0),
    );
  }
  if (sws.length) {
    y = grid(
      nodes,
      sws,
      swCols,
      y,
      SW_ROW_H,
      box,
      (s) => ({ id: `switch:${s.id}`, kind: 'switch', label: s.label }),
      spanSw,
    );
  }
  if (leds.length) {
    const w = Math.min(LED_W, box.usable / leds.length);
    const x0 = (1 - w * leds.length) / 2;
    leds.forEach((id, i) => {
      nodes.push({ id: `led:${id}`, kind: 'led', x: x0 + i * w, y, w, h: LED_ROW_H, label: id });
    });
    y += LED_ROW_H;
  }
  if (def.display) {
    nodes.push({
      id: `display:${def.display}`,
      kind: 'display',
      x: box.pad,
      y: y + DISPLAY_GAP,
      w: box.usable,
      h: displayH - DISPLAY_GAP,
    });
    y += displayH;
  }
  // Jacks are pinned to the bottom; leftover height is absorbed above them, and a dense
  // panel shrinks its knob rows (the art follows via the cqh guard in controls.css).
  const jack = (kind: 'in' | 'out') => (j: JackDef) => ({ id: `${kind}:${j.id}`, kind, label: j.label });
  const jackTop = 1 - BOTTOM_PAD - jacksH;
  const afterIns = grid(nodes, def.ins, jackCols, jackTop, JACK_ROW_H, box, jack('in'));
  grid(nodes, def.outs, jackCols, afterIns, JACK_ROW_H, box, jack('out'));
  // A control-dense module can overflow the 0..1 box; clamp rather than emit garbage geometry.
  const c01 = (n: number): number => (Number.isFinite(n) ? clamp(n, 0, 1) : 0);
  return { nodes: nodes.map((n) => ({ ...n, x: c01(n.x), y: c01(n.y), w: c01(n.w), h: c01(n.h) })) };
}
