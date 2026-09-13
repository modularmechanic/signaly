import type { Kind } from '../../core/types';
import type { Cable } from '../../engine/types';
import type { JackDir } from '../../hooks/jack-registry';

export interface Pt {
  x: number;
  y: number;
}

export interface Seg {
  a: Pt;
  b: Pt;
  /** the rope's quadratic control point — the only place the sag formula is applied */
  c: Pt;
  kind: Kind;
  alpha?: number;
  /** SHADE_MIN..1, the jacket's own brightness — see `jitter` */
  shade?: number;
  /** absent on the in-progress drag rope, which is not clickable */
  id?: number;
}

export interface Endpoint {
  at: Pt;
  kind: Kind;
}

export interface OverlayInput {
  cables: readonly Cable[];
  /** jack registry lookup; undefined for a jack that is not mounted */
  lookup: (uid: number, dir: JackDir, jackId: string) => Endpoint | undefined;
  drag: {
    fixed: { uid: number; dir: JackDir; def: { id: string; kind: Kind } };
    x: number;
    y: number;
  } | null;
  pointer: { x: number; y: number; inside: boolean };
  /** the pointer is over a control, so the cable under it is not grabbable */
  blockedAt: (x: number, y: number) => boolean;
  /** a press that began on a control is still down: the pointer is only passing over cables */
  controlHeld: boolean;
  /** the pointer, or the jacks under it, moved since the last frame. Omitted means yes. */
  moved?: boolean;
  /** the previous frame's hover, reused as-is while nothing has moved */
  prevHover?: number | null;
  /** live rack zoom; every px metric below is quoted at 1 and scaled by it */
  zoom: number;
  /** surface size, so a resize invalidates the repaint signature */
  w: number;
  h: number;
}

export interface OverlayView {
  segs: Seg[];
  hover: number | null;
  /** repaint key: equal signatures mean an identical frame */
  sig: string;
}

const SAG = 14;
/** extra sag a cable may pick up from its id: without it two ropes off the same output are
    pixel-identical and lie on one curve, which no real patch ever does */
const SAG_JITTER = 11;
/** Darkest a jacket may go. Applied as alpha over the black under-stroke, so it is a pure
    multiply: hue and saturation are untouched and only lightness moves. 0.97 displaces each
    kind colour by dE76 <= 2.7 — about one JND, measured on the four --kind-* tokens — so no
    kind can travel a perceptible step towards another and the CVD margins recorded in
    plans/open-questions.md survive. The per-kind dash in cable-canvas is untouched either way. */
export const SHADE_MIN = 0.97;
/** how close the pointer must come to a cable's centre line to grab it */
const HIT_PX = 7;
/** samples per curve for hit-testing: 24 keeps the error under a pixel at rack scale */
const HIT_STEPS = 24;

/** Two uncorrelated 0..1 fractions from a cable id. A hash, not Math.random: the same patch
    must draw the same tangle on every load, and the tests pin that. */
function jitter(id: number): [number, number] {
  let h = Math.imul(id ^ 0x9e3779b9, 0x21f0aaad);
  h = Math.imul(h ^ (h >>> 15), 0x735a2d97);
  h = (h ^ (h >>> 15)) >>> 0;
  return [(h & 1023) / 1023, ((h >>> 16) & 1023) / 1023];
}

const seg = (a: Pt, b: Pt, kind: Kind, z: number, extra?: Partial<Seg>): Seg => {
  const [sag, shade] = extra?.id === undefined ? [0, 0] : jitter(extra.id);
  return {
    a,
    b,
    // The droop term is already proportional to the on-screen span; only the constants need `z`.
    c: {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2 + (SAG + sag * SAG_JITTER) * z + Math.hypot(b.x - a.x, b.y - a.y) * 0.16,
    },
    kind,
    shade: 1 - shade * (1 - SHADE_MIN),
    ...extra,
  };
};

/** Distance from p to the quadratic through a -> c -> b, by sampling. */
function distToRope(s: Seg, p: Pt): number {
  let best = Infinity;
  let px = s.a.x;
  let py = s.a.y;
  for (let i = 1; i <= HIT_STEPS; i++) {
    const t = i / HIT_STEPS;
    const u = 1 - t;
    const x = u * u * s.a.x + 2 * u * t * s.c.x + t * t * s.b.x;
    const y = u * u * s.a.y + 2 * u * t * s.c.y + t * t * s.b.y;
    // distance from p to the segment (px,py)-(x,y)
    const dx = x - px;
    const dy = y - py;
    const len = dx * dx + dy * dy;
    const h = len === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - px) * dx + (p.y - py) * dy) / len));
    const ex = px + h * dx - p.x;
    const ey = py + h * dy - p.y;
    best = Math.min(best, Math.hypot(ex, ey));
    px = x;
    py = y;
  }
  return best;
}

/** Nearest cable under the pointer, or null. The canvas never takes pointer events, so a cable
    lying over a knob or jack loses: the control stays clickable. */
function hitTest(segs: readonly Seg[], i: OverlayInput): number | null {
  if (!i.pointer.inside) return null;
  let best: number | null = null;
  let bestD = HIT_PX * i.zoom;
  for (const s of segs) {
    if (s.id === undefined) continue;
    const d = distToRope(s, i.pointer);
    if (d < bestD) {
      bestD = d;
      best = s.id;
    }
  }
  if (best === null) return null;
  return i.blockedAt(i.pointer.x, i.pointer.y) ? null : best;
}

/** Everything the cable canvas paints, from data alone: rope geometry, what the pointer grabs,
    and a signature that skips the repaint when nothing moved. */
export function overlayView(i: OverlayInput): OverlayView {
  const segs: Seg[] = [];
  let sig = `${i.w}x${i.h}z${i.zoom}`;
  for (const c of i.cables) {
    const out = i.lookup(c.from.uid, 'out', c.from.jack);
    const inp = i.lookup(c.to.uid, 'in', c.to.jack);
    if (!out || !inp) continue;
    segs.push(seg(out.at, inp.at, out.kind, i.zoom, { id: c.id }));
    sig += `|${c.id},${out.at.x | 0},${out.at.y | 0},${inp.at.x | 0},${inp.at.y | 0}`;
  }
  if (i.drag) {
    const { fixed, x, y } = i.drag;
    const at = i.lookup(fixed.uid, fixed.dir, fixed.def.id);
    const mouse = { x, y };
    const fromFixed = fixed.dir === 'out';
    if (at)
      segs.push(
        seg(fromFixed ? at.at : mouse, fromFixed ? mouse : at.at, fixed.def.kind, i.zoom, { alpha: 0.85 }),
      );
    sig += `|d${x | 0},${y | 0},${fixed.def.kind}`;
  }
  // A drag owns the pointer: nothing is hoverable until it ends. Nor while a control is being
  // dragged over a cable — highlighting it as "click to remove" advertises what must not happen.
  // Hit-testing samples every rope, so it runs only when something moved: an idle rack reuses
  // the last answer instead of re-deriving it sixty times a second.
  const hover = i.drag || i.controlHeld ? null : (i.moved ?? true) ? hitTest(segs, i) : (i.prevHover ?? null);
  return { segs, hover, sig: `${sig}|h${hover ?? ''}` };
}

/** A press that travels further than this, in px, was a drag, not a click. */
export const CLICK_SLOP = 4;

export interface Press {
  /** the press began on a knob, fader, switch or jack */
  onControl: boolean;
  /** distance in px between pointerdown and pointerup */
  travel: number;
}

/** Whether the click ending this press may remove the hovered cable. A control holds pointer
    capture, so the click ending its drag is retargeted to it and bubbles to the window with
    whatever cable the cursor wandered over; a press that travelled is a drag for the same reason. */
export const clickRemovesCable = (p: Press): boolean => !p.onControl && p.travel <= CLICK_SLOP;

/** Where a jack really is on screen. The rack zooms with CSS `zoom`, and engines disagree about
    what `getBoundingClientRect` reports inside a zoomed box: Chromium and Firefox scale it,
    others hand back layout pixels. So it is measured: the rack's painted width over its layout
    width is the browser's answer. Null when rects are already in screen space. */
export function jackSpace(
  rect: { left: number; top: number; width: number },
  layoutWidth: number,
  zoom: number,
): { ox: number; oy: number; k: number } | null {
  if (zoom === 1 || layoutWidth <= 0 || rect.width <= 0) return null;
  const reported = rect.width / layoutWidth;
  const k = zoom / reported;
  if (!Number.isFinite(k) || Math.abs(k - 1) < 0.01) return null;
  return { ox: rect.left, oy: rect.top, k };
}
