import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

const CUT = 1000;

/** Output RMS for a 1 V sine at `hz` with SHAPE at `shape` and cutoff 1 kHz. */
async function gain(shape: number, hz: number): Promise<number> {
  const f = await loadProcessor('morph');
  f.p.shape = shape;
  f.p.cut = CUT;
  const n = 19200;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR);
  const O = [[new Float32Array(n)]];
  f.process([[inp]], O);
  const y = O[0]![0]!;
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += y[i]! * y[i]!;
  return Math.sqrt(sum / (n / 2));
}

describe('morph.dsp', () => {
  it('sweeps low pass -> band pass -> high pass across SHAPE', async () => {
    const lp = [await gain(0, 200), await gain(0, CUT), await gain(0, 8000)];
    const bp = [await gain(0.5, 200), await gain(0.5, CUT), await gain(0.5, 8000)];
    const hp = [await gain(1, 200), await gain(1, CUT), await gain(1, 8000)];
    expect(lp[0]!).toBeGreaterThan(lp[2]! * 10);
    expect(bp[1]!).toBeGreaterThan(bp[0]! * 2);
    expect(bp[1]!).toBeGreaterThan(bp[2]! * 2);
    expect(hp[2]!).toBeGreaterThan(hp[0]! * 10);
  });

  it('crossfades rather than switching: a quarter turn sits between the two taps', async () => {
    const mid = await gain(0.25, 8000);
    expect(mid).toBeGreaterThan(await gain(0, 8000));
    expect(mid).toBeLessThan(await gain(0.5, 8000));
  });
});
