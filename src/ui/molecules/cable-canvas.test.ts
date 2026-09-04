import { describe, expect, it } from 'vitest';
import { jackSpace } from './cable-canvas';

/** A rack 1000 layout px wide, painted at the given zoom, sitting 40 px from the viewport edge. */
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
