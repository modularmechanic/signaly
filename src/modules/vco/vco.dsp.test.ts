import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

const outs = (n: number, len: number): Float32Array[][] =>
  Array.from({ length: n }, () => [new Float32Array(len)]);

describe('vco.dsp', () => {
  it('produces bounded non-zero audio on every output', async () => {
    const v = await loadProcessor('vco');
    const O = outs(4, 256);
    v.process([], O);
    for (const [o] of O) {
      let peak = 0;
      for (const s of o!) peak = Math.max(peak, Math.abs(s));
      expect(peak).toBeGreaterThan(0.1);
      expect(peak).toBeLessThanOrEqual(6);
    }
  });

  it('tracks 1V/oct — one octave up doubles the frequency', async () => {
    const crossings = async (voct: number): Promise<number> => {
      const v = await loadProcessor('vco');
      const n = 4800; // 100 ms at 48 kHz
      const O = outs(4, n);
      v.process([[new Float32Array(n).fill(voct)]], O);
      const sin = O[0]![0]!;
      let c = 0;
      for (let i = 1; i < n; i++) if (sin[i - 1]! <= 0 && sin[i]! > 0) c++;
      return c;
    };
    const ratio = (await crossings(1)) / (await crossings(0));
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });
});
