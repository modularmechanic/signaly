import { describe, expect, it, vi } from 'vitest';
import type { Cable } from '../../engine/types';
import { overlayView, type Endpoint, type OverlayInput } from './cable-overlay';

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
    w: 800,
    h: 600,
    ...over,
  });

/** Where the rope actually hangs at t: the sag puts it well below the straight chord. */
const onRope = (t: number): { x: number; y: number } => {
  const s = view().segs[0];
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

  it('signs the frame so an unchanged one can skip the repaint', () => {
    expect(view().sig).toBe(view().sig);
    expect(view({ w: 801 }).sig).not.toBe(view().sig);
    expect(view({ pointer: { ...onRope(0.5), inside: true } }).sig).not.toBe(view().sig);
    expect(view({ lookup: () => ({ at: { x: 5, y: 5 }, kind: 'a' }) }).sig).not.toBe(view().sig);
  });
});
