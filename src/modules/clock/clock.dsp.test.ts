import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';
import type { Proc } from '../../../tests/dsp-harness';

/** Rising-edge sample indices on output `out` over `blocks` x 128 samples. */
function edges(c: Proc, out: number, blocks: number): number[] {
  const I: Float32Array[][] = [];
  const O = Array.from({ length: 5 }, () => [new Float32Array(128)]);
  const hits: number[] = [];
  let prev = 0;
  for (let b = 0; b < blocks; b++) {
    c.process(I, O);
    const buf = O[out]![0]!;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i]!;
      if (v > 2.5 && prev <= 2.5) hits.push(b * 128 + i);
      prev = v;
    }
  }
  return hits;
}

describe('clock.dsp', () => {
  it('pulses x1 once per beat at the knob BPM', async () => {
    const c = await loadProcessor('clock', { bpm: 120, run: 1 });
    const hits = edges(c, 0, 400);
    expect(hits.length).toBeGreaterThanOrEqual(3);
    // 120 BPM = 2 beats/s; the def seeds r1 at x1, so one pulse every SR/2 samples.
    expect(hits[2]! - hits[1]!).toBeCloseTo(SR / 2, -2);
  });

  it('scales the period with BPM and with the per-output rate', async () => {
    const slow = edges(await loadProcessor('clock', { bpm: 60, run: 1 }), 0, 800);
    expect(slow[2]! - slow[1]!).toBeCloseTo(SR, -2);
    // The def seeds r2 at index 4 = x2, so output 1 runs twice as fast as output 0.
    const c = await loadProcessor('clock', { bpm: 120, run: 1 });
    const fast = edges(c, 1, 400);
    expect(fast[2]! - fast[1]!).toBeCloseTo(SR / 4, -2);
  });

  it('stays silent while the transport is stopped', async () => {
    expect(edges(await loadProcessor('clock', { bpm: 120, run: 0 }), 0, 200)).toEqual([]);
  });
});
