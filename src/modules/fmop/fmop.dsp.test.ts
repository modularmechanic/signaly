import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

const CARRIER = 100;

/** Output at INDEX with RATIO 2, tuned to 100 Hz. */
async function render(index: number): Promise<Float32Array> {
  const o = await loadProcessor('fmop');
  o.p.ratio = 2;
  o.p.index = index;
  const n = 9600;
  const vo = new Float32Array(n).fill(Math.log2(CARRIER / 261.626));
  const O = [[new Float32Array(n)]];
  o.process([[vo]], O);
  return O[0]![0]!;
}

/** Amplitude of the `hz` component of `y` over its second half. */
function bin(y: Float32Array, hz: number): number {
  let re = 0,
    im = 0;
  const half = y.length / 2;
  for (let i = half; i < y.length; i++) {
    const a = (2 * Math.PI * hz * i) / SR;
    re += y[i]! * Math.cos(a);
    im += y[i]! * Math.sin(a);
  }
  return (2 * Math.sqrt(re * re + im * im)) / half;
}

describe('fmop.dsp', () => {
  it('is a pure tone at index 0 and grows sidebands at carrier +- ratio as index opens', async () => {
    const clean = await render(0);
    const fm = await render(4);
    // ratio 2 -> modulator 200 Hz -> first sidebands at 300 Hz and -100 (folds onto 100).
    expect(bin(clean, CARRIER)).toBeGreaterThan(4.9);
    expect(bin(clean, 300)).toBeLessThan(0.01);
    expect(bin(clean, 500)).toBeLessThan(0.01);
    expect(bin(fm, 300)).toBeGreaterThan(1);
    expect(bin(fm, 500)).toBeGreaterThan(0.5);
    expect(bin(fm, CARRIER)).toBeLessThan(bin(clean, CARRIER));
  });

  it('snaps the ratio knob to the table', async () => {
    const o = await loadProcessor('fmop');
    o.p.ratio = 2.1;
    o.p.index = 4;
    const n = 9600;
    const vo = new Float32Array(n).fill(Math.log2(CARRIER / 261.626));
    const O = [[new Float32Array(n)]];
    o.process([[vo]], O);
    expect(bin(O[0]![0]!, 300)).toBeCloseTo(bin(await render(4), 300), 5);
  });
});
