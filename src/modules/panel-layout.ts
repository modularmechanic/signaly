import type { JackDef, KnobDef, ModuleDef, PanelLayout, PanelNode, PanelNodeKind } from '../core/types';

/** One HP in CSS pixels. `--hp` on :root is set from this at boot — see src/main.tsx. */
export const HP_PX = 26;
/** Panel height in CSS pixels. `--panel-h` is published as `PANEL_H * --u`, so the faceplate
    keeps its 5.08 : 128.5 Eurorack ratio at every rack scale. */
export const PANEL_H = 658;
/** `.jack` socket diameter, published as `--jack-d`. The stylesheet draws the socket from it and
    `jackColsFor` packs to it, so neither can be widened without the other. */
export const JACK_D_PX = 37;
/** `.fader` slot width and the padding either side, published as `--fader-w` / `--fader-pad`.
    Their sum is FADER_COL_PX, the narrowest a knob column may get. */
export const FADER_W_PX = 20;
export const FADER_PAD_PX = 7;
/** Shortest panel node a control can be drawn in: a fader's 81px travel plus the gap and
    label of its cell. The layout guarantees it and the def checker holds authored panels to
    it, which is why controls.css no longer carries a floor of its own. A knob scales with
    its cell and has no floor, so it has no entry. */
export const MIN_CONTROL_PX = { fader: 96 } as const satisfies Partial<Record<PanelNodeKind, number>>;

const HEADER_H = 0.09;
const HEADER_GAP = 0.02;
const JACK_ROW_H = 0.1;
const JACK_GAP = 0.02;
const SW_ROW_H = 0.075;
const LED_ROW_H = 0.05;
const LED_W = 0.12;
const DISPLAY_GAP = 0.01;
const BOTTOM_PAD = 0.018;
const ROW_MAX = 0.15;
/** 40 px of a 658 px panel. `controls.css` shrinks the knob under 63 px and DELETES the label
    under 37 px, so a row thinner than this ships an unlabelled control. A module whose rows
    cannot reach it is too dense for its width — `panel-fit.test.ts` fails it rather than
    letting it render nameless knobs. */
const ROW_MIN = 0.061;
const BIG_ROW = 1.27;
const FIXED_H = HEADER_H + HEADER_GAP + JACK_GAP + BOTTOM_PAD;
const COL_PX = 66;
// The clear gutter between two sockets in a jack row.
const JACK_GAP_PX = 6;
const FADER_COL_PX = FADER_W_PX + 2 * FADER_PAD_PX;
const COLS_MAX = 4;
const EPS = 1e-9;

const cache = new Map<string, PanelLayout>();

/** A screen is reserved by naming a renderer OR by `screen` — a `.parts.tsx` fills that one. */
const hasScreen = (def: PanelDef): boolean => def.display !== undefined || def.screen === true;

const panelPad = (hp: number): number => (hp <= 3 ? 0.03 : 0.06);

const jackColsFor = (hp: number): number =>
  clamp(Math.floor((hp * HP_PX * (1 - 2 * panelPad(hp))) / (JACK_D_PX + JACK_GAP_PX)), 1, 8);

/** Authored geometry wins; every built-in and any user module without `panel` gets this. */
export function layoutPanel(def: ModuleDef): PanelLayout {
  if (def.panel) return def.panel;
  const hit = cache.get(def.id);
  if (hit) return hit;
  const computed = { nodes: computePanel(def).nodes };
  cache.set(def.id, computed);
  return computed;
}

/** Drop a memoised layout (a user module was re-authored under the same id). */
export function forgetPanel(id: string): void {
  cache.delete(id);
}

/** Everything the geometry needs — `id` is only the memo key, so a user def fits here. */
export type PanelDef = Omit<ModuleDef, 'id'>;

export interface PanelFit {
  fits: boolean;
  /** the hp to use: the declared one when it fits, else the narrowest in 1..maxHp that does
      — null when no width lays this def out at all */
  hp: number | null;
}

/** Does `def` lay out at its declared hp, and if not what is the narrowest hp that would?
    The one verdict on computed geometry — nobody re-derives these bands elsewhere. */
export function fitPanel(def: PanelDef, maxHp: number): PanelFit {
  if (computePanel(def).fits) return { fits: true, hp: def.hp };
  for (let hp = 1; hp <= maxHp; hp++) if (computePanel({ ...def, hp }).fits) return { fits: false, hp };
  return { fits: false, hp: null };
}

interface Bands {
  cols: number;
  swCols: number;
  jackCols: number;
  weighted: number;
  rowH: number;
  knobsH: number;
  jacksH: number;
  ledH: number;
  displayH: number;
  spanSw: (s: { options: string[] }) => number;
  box: { pad: number; usable: number };
}

function measure(def: PanelDef, cols: number): Bands {
  const pad = panelPad(def.hp);
  const box = { pad, usable: 1 - 2 * pad };
  const usablePx = def.hp * HP_PX * box.usable;
  const swCols = def.hp < 10 ? Math.min(cols, 2) : cols;
  // >3 options, or a trough whose legends cannot fit one switch column, takes the whole row
  const spanSw = (s: { options: string[] }): number =>
    s.options.length > 3 || s.options.reduce((n, o) => n + o.length * 8.2 + 6, 6) > usablePx / swCols ? 1 : 0;
  const jackCols = jackColsFor(def.hp);
  const jacksH = (Math.ceil(def.ins.length / jackCols) + Math.ceil(def.outs.length / jackCols)) * JACK_ROW_H;
  const swH = gridRows(def.sws ?? [], swCols, spanSw) * SW_ROW_H;
  const ledH = (def.leds ?? []).length ? LED_ROW_H : 0;
  const displayH = hasScreen(def) ? (def.hp >= 6 ? 0.2 : 0.16) + DISPLAY_GAP : 0;
  const knobsH = Math.max(0, 1 - FIXED_H - swH - ledH - displayH - jacksH);
  const weighted = knobWeight(def.knobs, cols);
  const rowH = weighted > 0 ? clamp(knobsH / weighted, ROW_MIN, ROW_MAX) : 0;
  return { cols, swCols, jackCols, weighted, rowH, knobsH, jacksH, ledH, displayH, spanSw, box };
}

/** Height of the shortest fader this row height would draw, or Infinity when there are none. */
function faderPx(def: PanelDef, rowH: number): number {
  let px = Infinity;
  for (const k of def.knobs) if (k.fader) px = Math.min(px, rowH * (k.big ? BIG_ROW : 1) * PANEL_H);
  return px;
}

/** More, narrower columns pack the knobs into fewer rows, so each row gets taller: the only
    lever the computed layout has when a fader would otherwise render below its minimum. */
function bandsFor(def: PanelDef): Bands {
  const usablePx = def.hp * HP_PX * (1 - 2 * panelPad(def.hp));
  let best = measure(def, clamp(Math.floor(usablePx / COL_PX), 1, COLS_MAX));
  if (faderPx(def, best.rowH) >= MIN_CONTROL_PX.fader) return best;
  const widest = clamp(Math.floor(usablePx / FADER_COL_PX), 1, def.knobs.length);
  for (let c = best.cols + 1; c <= widest; c++) {
    const b = measure(def, c);
    if (b.rowH > best.rowH) best = b;
    if (faderPx(def, best.rowH) >= MIN_CONTROL_PX.fader) break;
  }
  return best;
}

function computePanel(def: PanelDef): { nodes: PanelNode[]; fits: boolean } {
  const b = bandsFor(def);
  const box = b.box;
  // The header band (0..HEADER_H) is reserved for <ModuleHeader>; no node is emitted for it.
  const nodes: PanelNode[] = [];
  let y = HEADER_H + HEADER_GAP;
  if (b.weighted > 0) {
    // Spare height used to pool into one dead band above the pinned jacks — NOISE wasted 482 px
    // of its 658. Split it above and below so the control block sits centred instead.
    y += Math.max(0, b.knobsH - b.rowH * b.weighted) / 2;
    y = grid(
      nodes,
      def.knobs,
      b.cols,
      y,
      b.rowH,
      box,
      (k) => ({
        id: `${k.fader ? 'fader' : 'knob'}:${k.id}`,
        kind: k.fader ? 'fader' : 'knob',
        label: k.label,
      }),
      (k) => (k.big ? BIG_ROW : 0),
    );
  }
  const sws = def.sws ?? [];
  if (sws.length) {
    y = grid(
      nodes,
      sws,
      b.swCols,
      y,
      SW_ROW_H,
      box,
      (s) => ({ id: `switch:${s.id}`, kind: 'switch', label: s.label }),
      b.spanSw,
    );
  }
  const leds = def.leds ?? [];
  if (leds.length) {
    const w = Math.min(LED_W, box.usable / leds.length);
    const x0 = (1 - w * leds.length) / 2;
    leds.forEach((id, i) => {
      nodes.push({ id: `led:${id}`, kind: 'led', x: x0 + i * w, y, w, h: LED_ROW_H, label: id });
    });
    y += LED_ROW_H;
  }
  if (hasScreen(def)) {
    nodes.push({
      id: `display:${def.display ?? 'screen'}`,
      kind: 'display',
      x: box.pad,
      y: y + DISPLAY_GAP,
      w: box.usable,
      h: b.displayH - DISPLAY_GAP,
    });
  }
  // Jacks are pinned to the bottom; leftover height is absorbed above them, and a dense
  // panel shrinks its knob rows (the art follows via the cqh guard in controls.css).
  const jack = (kind: 'in' | 'out') => (j: JackDef) => ({ id: `${kind}:${j.id}`, kind, label: j.label });
  const jackTop = 1 - BOTTOM_PAD - b.jacksH;
  const afterIns = grid(nodes, def.ins, b.jackCols, jackTop, JACK_ROW_H, box, jack('in'));
  grid(nodes, def.outs, b.jackCols, afterIns, JACK_ROW_H, box, jack('out'));

  const inBox = (n: PanelNode): boolean =>
    [n.x, n.y, n.w, n.h].every(Number.isFinite) &&
    n.x >= -EPS &&
    n.y >= -EPS &&
    n.x + n.w <= 1 + EPS &&
    n.y + n.h <= 1 + EPS;
  const fits =
    FIXED_H + b.jacksH <= 1 + EPS && faderPx(def, b.rowH) >= MIN_CONTROL_PX.fader - EPS && nodes.every(inBox);
  // A def that slipped past `fitPanel` must still not render garbage geometry.
  const c01 = (n: number): number => (Number.isFinite(n) ? clamp(n, 0, 1) : 0);
  return { fits, nodes: nodes.map((n) => ({ ...n, x: c01(n.x), y: c01(n.y), w: c01(n.w), h: c01(n.h) })) };
}

const clamp = (n: number, lo: number, hi: number): number => (n < lo ? lo : n > hi ? hi : n);

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
