import type { KnobDef, ModuleDef, PanelLayout, PanelNode, PanelNodeKind } from '../core/types';

const HEADER_H = 0.1;
const JACK_ROW_H = 0.09;
const SW_ROW_H = 0.07;
const LED_ROW_H = 0.05;
const LED_W = 0.12;
const DISPLAY_H = 0.18;
const PAD_X = 0.06;

const cache = new Map<string, PanelLayout>();

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

/** Lay `items` out left-to-right in rows of `perRow`, returning the y below the block. */
function grid<T>(
  nodes: PanelNode[],
  items: readonly T[],
  perRow: number,
  y: number,
  rowH: number,
  make: (item: T, span: boolean) => { id: string; kind: PanelNodeKind; label?: string },
  spanRow?: (item: T) => boolean,
): number {
  const usable = 1 - 2 * PAD_X;
  let col = 0;
  let row = 0;
  for (const item of items) {
    const span = spanRow?.(item) ?? false;
    if (span && col > 0) {
      row++;
      col = 0;
    }
    const w = span ? usable : usable / perRow;
    nodes.push({
      ...make(item, span),
      x: PAD_X + (span ? 0 : (col * usable) / perRow),
      y: y + row * rowH,
      w,
      h: rowH,
    });
    if (span) {
      row++;
      col = 0;
    } else if (++col === perRow) {
      row++;
      col = 0;
    }
  }
  return y + (row + (col > 0 ? 1 : 0)) * rowH;
}

function knobRowCount(knobs: readonly KnobDef[], cols: number): number {
  let rows = 0;
  let col = 0;
  for (const k of knobs) {
    if (k.big) {
      if (col > 0) rows++;
      rows++;
      col = 0;
    } else if (++col === cols) {
      rows++;
      col = 0;
    }
  }
  return rows + (col > 0 ? 1 : 0);
}

function computePanel(def: ModuleDef): PanelLayout {
  const cols = def.hp <= 4 ? 1 : 2;
  const jackCols = def.hp <= 4 ? 2 : 4;
  const sws = def.sws ?? [];
  const leds = def.leds ?? [];
  // The header band (0..HEADER_H) is reserved for <ModuleHeader>; no node is emitted for it.
  const nodes: PanelNode[] = [];

  const jackRows = Math.ceil(def.ins.length / jackCols) + Math.ceil(def.outs.length / jackCols);
  const swH = Math.ceil(sws.length / cols) * SW_ROW_H;
  const ledH = leds.length ? LED_ROW_H : 0;
  const displayH = def.display ? DISPLAY_H : 0;
  const knobRows = knobRowCount(def.knobs, cols);
  const knobsH = Math.max(0, 1 - HEADER_H - jackRows * JACK_ROW_H - swH - ledH - displayH);

  let y = HEADER_H;
  if (knobRows > 0) {
    y = grid(
      nodes,
      def.knobs,
      cols,
      y,
      knobsH / knobRows,
      (k) => ({
        id: `${k.fader ? 'fader' : 'knob'}:${k.id}`,
        kind: k.fader ? 'fader' : 'knob',
        label: k.label,
      }),
      (k) => k.big === true,
    );
  }
  if (sws.length) {
    y = grid(nodes, sws, cols, y, SW_ROW_H, (s) => ({
      id: `switch:${s.id}`,
      kind: 'switch',
      label: s.label,
    }));
  }
  if (leds.length) {
    const w = Math.min(LED_W, (1 - 2 * PAD_X) / leds.length);
    leds.forEach((id, i) => {
      nodes.push({
        id: `led:${id}`,
        kind: 'led',
        x: (1 - w * leds.length) / 2 + i * w,
        y,
        w,
        h: LED_ROW_H,
        label: id,
      });
    });
    y += LED_ROW_H;
  }
  if (def.display) {
    nodes.push({
      id: `display:${def.display}`,
      kind: 'display',
      x: PAD_X,
      y,
      w: 1 - 2 * PAD_X,
      h: DISPLAY_H,
    });
    y += DISPLAY_H;
  }
  y = grid(nodes, def.ins, jackCols, y, JACK_ROW_H, (j) => ({
    id: `in:${j.id}`,
    kind: 'in',
    label: j.label,
  }));
  grid(nodes, def.outs, jackCols, y, JACK_ROW_H, (j) => ({ id: `out:${j.id}`, kind: 'out', label: j.label }));
  // A control-dense module can overflow the 0..1 box; clamp rather than emit garbage geometry.
  const c01 = (n: number): number => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
  return { nodes: nodes.map((n) => ({ ...n, x: c01(n.x), y: c01(n.y), w: c01(n.w), h: c01(n.h) })) };
}
