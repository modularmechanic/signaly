import { describe, expect, it } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Runs 200 blocks of a constant-amplitude tone; returns the last GATE OUT sample. */
async function gateOut(p: Params, amp: number): Promise<number> {
  const g = await loadProcessor('gate', p);
  const sig = new Float32Array(128).fill(amp);
  const O = Array.from({ length: 3 }, () => [new Float32Array(128)]);
  for (let b = 0; b < 200; b++) g.process([[sig], [sig], [], []], O);
  return O[2]![0]![127] ?? -1;
}

describe('gate.dsp', () => {
  it('keeps GATE OUT low below threshold even at maximum RANGE', async () => {
    expect(await gateOut({ thr: -40, atk: 0.002, hold: 0.05, rel: 0.15, range: 0 }, 0.001)).toBe(0);
  });

  it('raises GATE OUT above threshold', async () => {
    expect(await gateOut({ thr: -40, atk: 0.002, hold: 0.05, rel: 0.15, range: -60 }, 5)).toBe(5);
  });
});
