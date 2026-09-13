import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** One trigger at sample 0, then `n` samples of free-running envelope. */
async function run(p: Record<string, number>, n: number): Promise<{ env: Float32Array; eoc: Float32Array }> {
  const e = await loadProcessor('ad', p);
  const trig = new Float32Array(n);
  for (let i = 0; i < 64; i++) trig[i] = 5;
  const O = [[new Float32Array(n)], [new Float32Array(n)]];
  e.process([[trig], [], []], O);
  return { env: O[0]![0]!, eoc: O[1]![0]! };
}

const edges = (g: Float32Array): number => {
  let n = 0;
  for (let i = 1; i < g.length; i++) if (g[i]! > 2.5 && g[i - 1]! <= 2.5) n++;
  return n;
};

const peakAt = (e: Float32Array): number => {
  let best = 0;
  for (let i = 1; i < e.length; i++) if (e[i]! > e[best]!) best = i;
  return best;
};

// ATTACK 10 ms = 480 samples, DECAY 20 ms = 960 samples at 48 kHz.
const SHAPE = { a: 0.01, d: 0.02, curve: 0, loop: 0 };

describe('ad.dsp', () => {
  it('rises over ATTACK, falls over DECAY and fires EOC once', async () => {
    const { env, eoc } = await run(SHAPE, 4800);
    const peak = peakAt(env);
    expect(peak).toBeGreaterThan(460);
    expect(peak).toBeLessThan(500);
    expect(env[peak]!).toBeCloseTo(5, 1);
    expect(env[240]!).toBeCloseTo(2.5, 1); // half way up the linear attack
    expect(env[960]!).toBeCloseTo(2.5, 1); // half way down the linear decay
    expect(env[1400]!).toBeGreaterThan(0);
    expect(env[1500]!).toBe(0); // one-shot: idle after the cycle
    expect(edges(eoc)).toBe(1);
  });

  it('re-fires each cycle in LOOP and holds the same period', async () => {
    const { eoc } = await run({ ...SHAPE, loop: 1 }, 4800);
    // period = 480 + 960 = 1440 samples, so 4800 samples hold three whole cycles
    expect(edges(eoc)).toBe(3);
  });

  it('bends the attack away from the straight line as CURVE opens', async () => {
    const lin = (await run(SHAPE, 2000)).env;
    const exp = (await run({ ...SHAPE, curve: 1 }, 2000)).env;
    expect(exp[240]!).toBeLessThan(lin[240]! - 1);
    expect(exp[peakAt(exp)]!).toBeCloseTo(5, 1);
  });
});
