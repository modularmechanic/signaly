import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

const N = 16;
const held = (v: number): Float32Array[] => [new Float32Array(N).fill(v)];

/** [L, R] volts for held A and B levels. */
async function out(p: Record<string, number>, av: number, bv: number): Promise<[number, number]> {
  const x = await loadProcessor('xfade', p);
  const O = [[new Float32Array(N)], [new Float32Array(N)]];
  x.process([held(av), held(bv), [], []], O);
  return [O[0]![0]![N - 1]!, O[1]![0]![N - 1]!];
}

/** Gains applied to A and B at this fade, read off the left channel with PAN hard left. */
const gains = async (fade: number): Promise<[number, number]> => [
  (await out({ fade, pan: -1 }, 5, 0))[0] / 5,
  (await out({ fade, pan: -1 }, 0, 5))[0] / 5,
];

describe('xfade.dsp', () => {
  it('is all A at fade 0 and all B at fade 1', async () => {
    expect(await out({ fade: 0, pan: -1 }, 5, -3)).toEqual([5, 0]);
    expect((await out({ fade: 1, pan: -1 }, 5, -3))[0]).toBeCloseTo(-3, 5);
  });

  it('holds constant power across the sweep instead of summing to 2', async () => {
    const power: number[] = [];
    for (const f of [0, 0.25, 0.5, 0.75, 1]) {
      const [ga, gb] = await gains(f);
      power.push(ga * ga + gb * gb);
    }
    for (const p of power) expect(p).toBeCloseTo(1, 5);
    // the mid-point sits at -3 dB per side (0.707), not at the linear 0.5
    expect((await gains(0.5))[0]).toBeCloseTo(Math.SQRT1_2, 5);
    expect((await gains(0.5))[0] + (await gains(0.5))[1]).toBeGreaterThan(1.4);
  });

  it('pans the mixed result and clamps to the +/-5 V rail', async () => {
    const [l, r] = await out({ fade: 0, pan: 1 }, 5, 0);
    expect(l).toBeCloseTo(0, 5);
    expect(r).toBeCloseTo(5, 5);
    // both inputs at the rail through the mid-point would reach 7.07 V unclamped
    expect((await out({ fade: 0.5, pan: -1 }, 5, 5))[0]).toBe(5);
  });

  it('sweeps the fade from FADE CV', async () => {
    const x = await loadProcessor('xfade');
    x.p.fade = 0;
    x.p.pan = -1;
    const O = [[new Float32Array(N)], [new Float32Array(N)]];
    x.process([held(0), held(5), held(5)], O);
    expect(O[0]![0]![N - 1]!).toBeCloseTo(5, 5); // +5 V of CV = full travel to B
  });
});
