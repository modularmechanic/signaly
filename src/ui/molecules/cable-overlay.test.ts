import { describe, expect, it, vi } from 'vitest';
import type { Cable } from '../../engine/types';
import {
  CLICK_SLOP,
  clickRemovesCable,
  jackSpace,
  overlayView,
  type Endpoint,
  type OverlayInput,
} from './cable-overlay';

const CABLE: Cable = { id: 7, from: { uid: 1, jack: 'o' }, to: { uid: 2, jack: 'i' } };

const AT: Record<string, Endpoint> = {
  '1:out:o': { at: { x: 0, y: 100 }, kind: 'a' },
  '2:in:i': { at: { x: 200, y: 100 }, kind: 'p' },
};

const view = (over: Partial<OverlayInput> = {}): ReturnType<typeof overlayView> =>
  overlayView({
    cables: [CABLE],
    lookup: (uid, dir, jackId) => AT[`${uid}:${dir}:${jackId}`],
    drag: null,
    pointer: { x: -1, y: -1, inside: false },
    blockedAt: () => false,
    controlHeld: false,
    zoom: 1,
    w: 800,
    h: 600,
    ...over,
  });

/** Where the rope actually hangs at t: the sag puts it well below the straight chord. */
const onRope = (t: number, over: Partial<OverlayInput> = {}): { x: number; y: number } => {
  const s = view(over).segs[0];
  if (!s) throw new Error('no seg');
  const u = 1 - t;
  return {
    x: u * u * s.a.x + 2 * u * t * s.c.x + t * t * s.b.x,
    y: u * u * s.a.y + 2 * u * t * s.c.y + t * t * s.b.y,
  };
};

describe('overlayView', () => {
  it('builds one seg per cable, taking colour kind from the output end', () => {
    const { segs } = view();
    expect(segs).toHaveLength(1);
    expect(segs[0]?.a).toEqual({ x: 0, y: 100 });
    expect(segs[0]?.b).toEqual({ x: 200, y: 100 });
    expect(segs[0]?.kind).toBe('a');
    expect(segs[0]?.id).toBe(7);
  });

  it('skips a cable whose jack is not mounted', () => {
    expect(view({ lookup: () => undefined }).segs).toEqual([]);
  });

  it('sags below the straight line, and hit-tests against that same curve', () => {
    const mid = onRope(0.5);
    expect(mid.y).toBeGreaterThan(110); // SAG + length-proportional droop
    expect(view({ pointer: { ...mid, inside: true } }).hover).toBe(7);
    // the straight chord between the jacks is nowhere near the rope
    expect(view({ pointer: { x: 100, y: 100, inside: true } }).hover).toBeNull();
  });

  it('grabs nothing while the pointer is outside, or further than the hit radius', () => {
    const mid = onRope(0.5);
    expect(view({ pointer: { ...mid, inside: false } }).hover).toBeNull();
    expect(view({ pointer: { x: mid.x, y: mid.y + 20, inside: true } }).hover).toBeNull();
  });

  it('lets a control under the pointer veto the grab', () => {
    const mid = onRope(0.5);
    const blockedAt = vi.fn(() => true);
    expect(view({ pointer: { ...mid, inside: true }, blockedAt }).hover).toBeNull();
    expect(blockedAt).toHaveBeenCalledWith(mid.x, mid.y);
    // only consulted once a cable is actually in range
    blockedAt.mockClear();
    view({ pointer: { x: 100, y: 100, inside: true }, blockedAt });
    expect(blockedAt).not.toHaveBeenCalled();
  });

  it('skips the hit test on a frame where nothing moved, and reuses the last hover', () => {
    // An idle rack must not re-sample every rope each frame; the answer cannot have changed.
    const mid = onRope(0.5);
    const blockedAt = vi.fn(() => false);
    const idle = view({ pointer: { ...mid, inside: true }, blockedAt, moved: false, prevHover: 7 });
    expect(idle.hover).toBe(7);
    expect(blockedAt).not.toHaveBeenCalled();
    // ...and stays empty rather than inventing one when there was none
    expect(view({ pointer: { ...mid, inside: true }, moved: false, prevHover: null }).hover).toBeNull();
  });

  it('hit-tests again as soon as something moved', () => {
    const mid = onRope(0.5);
    const blockedAt = vi.fn(() => false);
    expect(view({ pointer: { ...mid, inside: true }, blockedAt, moved: true, prevHover: null }).hover).toBe(7);
    expect(blockedAt).toHaveBeenCalledWith(mid.x, mid.y);
    // omitting the flag is the safe default: recompute
    expect(view({ pointer: { ...mid, inside: true } }).hover).toBe(7);
  });

  it('draws the drag rope from the fixed jack to the pointer, and hovers nothing meanwhile', () => {
    const drag = {
      fixed: { uid: 1, dir: 'out' as const, def: { id: 'o', kind: 'c' as const } },
      x: 50,
      y: 300,
    };
    const { segs, hover } = view({ drag, pointer: { ...onRope(0.5), inside: true } });
    expect(segs).toHaveLength(2);
    expect(segs[1]?.b).toEqual({ x: 50, y: 300 });
    expect(segs[1]?.kind).toBe('c');
    expect(segs[1]?.id).toBeUndefined();
    expect(hover).toBeNull();
  });

  it('jitters sag and jacket lightness per cable, the same way on every load', () => {
    const at = (id: number) => view({ cables: [{ ...CABLE, id }] }).segs[0];
    const one = at(7);
    expect(one).toEqual(at(7)); // deterministic: a saved patch redraws identically
    const two = at(8);
    expect(two?.c.y).not.toBe(one?.c.y);
    expect(two?.shade).not.toBe(one?.shade);
    // Two cables off one output hang on different curves instead of one shared rope.
    const both = view({ cables: [CABLE, { ...CABLE, id: 9 }] }).segs;
    expect(both[0]?.c.y).not.toBe(both[1]?.c.y);
  });

  it('keeps the jitter inside the budget that protects the CVD-safe kind palette', () => {
    // Lightness only, and never more than 3%: a kind can never take a perceptible step
    // towards another kind. Sag stays within one jitter span of the base 14px droop.
    // The drag rope carries no id, so it draws the unjittered curve over the same chord.
    const drag = view({
      cables: [],
      drag: { fixed: { uid: 1, dir: 'out', def: { id: 'o', kind: 'a' } }, x: 200, y: 100 },
    }).segs[0];
    expect(drag?.shade).toBe(1);
    const base = drag?.c.y ?? 0;
    for (let id = 1; id <= 500; id++) {
      const s = view({ cables: [{ ...CABLE, id }] }).segs[0];
      expect(s?.shade).toBeGreaterThanOrEqual(0.97);
      expect(s?.shade).toBeLessThanOrEqual(1);
      expect(s?.c.y).toBeGreaterThanOrEqual(base);
      expect(s?.c.y).toBeLessThanOrEqual(base + 11);
    }
  });

  it('hovers nothing while a press that began on a control is still down', () => {
    // Turning a knob and dragging across a cable must not light it up as removable.
    const pointer = { ...onRope(0.5), inside: true };
    expect(view({ pointer }).hover).toBe(7);
    expect(view({ pointer, controlHeld: true }).hover).toBeNull();
  });

  it('scales the sag constant and the grab radius with the rack zoom', () => {
    const mid = onRope(0.5);
    const zoomed = onRope(0.5, { zoom: 2 });
    expect(zoomed.y).toBeGreaterThan(mid.y);
    // 10px off the rope: out of reach at 100%, inside the doubled radius at 200%
    const off = { x: zoomed.x, y: zoomed.y + 10, inside: true };
    expect(view({ pointer: off, zoom: 2 }).hover).toBe(7);
    expect(view({ pointer: { ...mid, y: mid.y + 10, inside: true } }).hover).toBeNull();
  });

  it('signs the frame so an unchanged one can skip the repaint', () => {
    expect(view({ zoom: 2 }).sig).not.toBe(view().sig);
    expect(view().sig).toBe(view().sig);
    expect(view({ w: 801 }).sig).not.toBe(view().sig);
    expect(view({ pointer: { ...onRope(0.5), inside: true } }).sig).not.toBe(view().sig);
    expect(view({ lookup: () => ({ at: { x: 5, y: 5 }, kind: 'a' }) }).sig).not.toBe(view().sig);
  });
});

describe('clickRemovesCable', () => {
  it('removes the cable under a real click', () => {
    expect(clickRemovesCable({ onControl: false, travel: 0 })).toBe(true);
    // A hand is never perfectly still; the slop is what keeps a click a click.
    expect(clickRemovesCable({ onControl: false, travel: CLICK_SLOP })).toBe(true);
  });

  it('keeps the cable when the press began on a control', () => {
    // The reported bug: turn a knob, let go over a cable, and the cable vanished. The knob has
    // pointer capture, so the click is retargeted to it and bubbles to the window listener with
    // whatever cable the cursor drifted over still hovered.
    expect(clickRemovesCable({ onControl: true, travel: 0 })).toBe(false);
    expect(clickRemovesCable({ onControl: true, travel: 300 })).toBe(false);
  });

  it('keeps the cable when the press travelled, wherever it began', () => {
    expect(clickRemovesCable({ onControl: false, travel: CLICK_SLOP + 1 })).toBe(false);
    expect(clickRemovesCable({ onControl: false, travel: 200 })).toBe(false);
  });
});

/** A rack 1000 layout px wide, painted at the given width, sitting 40 px from the viewport edge. */
const rack = (paintedWidth: number, left = 40, top = 60): { left: number; top: number; width: number } => ({
  left,
  top,
  width: paintedWidth,
});

describe('jackSpace', () => {
  it('corrects nothing at 100 percent', () => {
    expect(jackSpace(rack(1000), 1000, 1)).toBeNull();
  });

  it('corrects nothing when the browser already scales rects by the zoom', () => {
    // Chromium and Firefox: a 1000 px box at 0.5 zoom reports 500 px, so a jack rect is already
    // in screen space and must be left exactly alone.
    expect(jackSpace(rack(500), 1000, 0.5)).toBeNull();
    expect(jackSpace(rack(2000), 1000, 2)).toBeNull();
  });

  it('maps layout pixels to screen pixels when the browser reports rects unscaled', () => {
    // An engine that ignores zoom reports the full 1000 px at 0.5 zoom. A jack 200 px into the
    // rack is really painted 100 px in, so the correction has to halve the offset.
    const s = jackSpace(rack(1000), 1000, 0.5);
    expect(s).not.toBeNull();
    expect(s!.k).toBeCloseTo(0.5, 6);
    expect(s!.ox + (240 - s!.ox) * s!.k).toBeCloseTo(140, 6); // 40 + 200*0.5
  });

  it('maps the other direction when zoomed in', () => {
    const s = jackSpace(rack(1000), 1000, 2);
    expect(s!.k).toBeCloseTo(2, 6);
    expect(s!.ox + (240 - s!.ox) * s!.k).toBeCloseTo(440, 6); // 40 + 200*2
  });

  it('refuses to divide by a rack that has not been laid out yet', () => {
    expect(jackSpace(rack(0), 1000, 0.5)).toBeNull();
    expect(jackSpace(rack(500), 0, 0.5)).toBeNull();
  });
});
