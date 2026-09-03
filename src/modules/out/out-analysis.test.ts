import { describe, expect, it } from 'vitest';
import {
  meanSquareToLufs,
  rms,
  smoothMeanSquare,
  stereoCorrelation,
  stereoMeanSquare,
  voltsToDbfs,
} from './out-analysis';

const fill = (n: number, f: (i: number) => number): Float32Array =>
  Float32Array.from({ length: n }, (_, i) => f(i));

describe('out level maths', () => {
  it('measures rms and treats an empty block as silence', () => {
    expect(rms(new Float32Array(0))).toBe(0);
    expect(rms(fill(4, () => 5))).toBeCloseTo(5);
    expect(rms(fill(1000, (i) => 5 * Math.sin((i / 1000) * Math.PI * 2 * 10)))).toBeCloseTo(
      5 / Math.SQRT2,
      2,
    );
  });

  it('maps ±5 V to 0 dBFS and clamps the floor at -90', () => {
    expect(voltsToDbfs(5)).toBeCloseTo(0);
    expect(voltsToDbfs(-5)).toBeCloseTo(0);
    expect(voltsToDbfs(2.5)).toBeCloseTo(-6.02, 1);
    expect(voltsToDbfs(0)).toBe(-90);
  });

  it('correlates identical, silent and inverted stereo pairs', () => {
    const l = fill(64, (i) => Math.sin(i));
    expect(stereoCorrelation(l, l)).toBeCloseTo(1);
    expect(
      stereoCorrelation(
        l,
        fill(64, (i) => -Math.sin(i)),
      ),
    ).toBeCloseTo(-1);
    expect(stereoCorrelation(new Float32Array(64), new Float32Array(64))).toBe(0);
    expect(stereoCorrelation(new Float32Array(0), new Float32Array(0))).toBe(0);
  });

  it('normalises stereo mean-square to full scale and converts it to LUFS', () => {
    const full = fill(32, () => 5);
    expect(stereoMeanSquare(full, full)).toBeCloseTo(1);
    expect(stereoMeanSquare(new Float32Array(32), new Float32Array(32))).toBe(0);
    expect(meanSquareToLufs(1)).toBeCloseTo(-0.691);
    expect(meanSquareToLufs(0)).toBe(-90);
  });

  it('integrates mean-square toward the target and never below zero', () => {
    expect(smoothMeanSquare(0, 1, 0)).toBe(0);
    const step = smoothMeanSquare(0, 1, 0.4);
    expect(step).toBeGreaterThan(0.6);
    expect(step).toBeLessThan(0.7);
    expect(smoothMeanSquare(1, -1, 10)).toBeCloseTo(0);
  });
});
