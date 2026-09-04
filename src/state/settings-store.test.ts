import { describe, expect, it } from 'vitest';
import { clampZoom, DEFAULT_ZOOM, MAX_ZOOM, MIN_ZOOM } from './settings-store';

describe('clampZoom', () => {
  it('keeps a usable value untouched', () => {
    expect(clampZoom(1)).toBe(1);
    expect(clampZoom(0.33)).toBe(0.33);
    expect(clampZoom(4)).toBe(4);
  });

  it('floors at the readability limit', () => {
    expect(clampZoom(0.01)).toBe(MIN_ZOOM);
    expect(clampZoom(-5)).toBe(MIN_ZOOM);
  });

  it('does not cap zooming in at any level a person would reach', () => {
    // The brief is "no maximum": 100x must survive, and the only ceiling is a runaway guard
    // far past the point where a single knob already fills the screen.
    expect(clampZoom(100)).toBe(100);
    expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
    expect(MAX_ZOOM).toBeGreaterThanOrEqual(1000);
  });

  it('falls back to 1 for a value that is not a number', () => {
    expect(clampZoom(Number.NaN)).toBe(DEFAULT_ZOOM);
    expect(clampZoom(Number.POSITIVE_INFINITY)).toBe(DEFAULT_ZOOM);
  });
});
