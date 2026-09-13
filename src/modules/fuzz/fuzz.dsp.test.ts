import { describe, expect, it } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** Goertzel magnitude of `f` in `buf`. */
function mag(buf: Float32Array, f: number): number {
  const w = (2 * Math.PI * f) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0;
  let s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    const s = (buf[i] ?? 0) + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (2 * Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w))) / buf.length;
}

/** Run a 220 Hz sine at `volts` through the fuzz. */
async function run(volts: number, params: Params): Promise<Float32Array> {
  const f = await loadProcessor('fuzz', {
    fuzz: 4,
    gate: 0,
    starve: 0,
    level: 0.8,
    mode: 0,
    ...params,
  });
  const n = 4800;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = volts * Math.sin((2 * Math.PI * 220 * i) / SR);
  const out = new Float32Array(n);
  f.process([[inp], []], [[out]]);
  return out;
}

/** Peak over the settled second half of the buffer. */
function peak(buf: Float32Array): number {
  let m = 0;
  for (let i = buf.length / 2; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i] ?? 0));
  return m;
}

/** Harmonic energy above the fundamental — brighter modes push more of it. Reads only the
    settled second half, past the gate's opening ramp. */
function harmonics(buf: Float32Array): number {
  const tail = buf.subarray(buf.length / 2);
  let sum = 0;
  for (const v of tail) sum += v * v;
  const f0 = mag(tail, 220);
  const fund = (f0 * f0) / 2;
  return Math.max(0, sum / tail.length - fund) / Math.max(fund, 1e-9);
}

describe('fuzz.dsp', () => {
  it('stays near silent when LEVEL is near zero', async () => {
    expect(peak(await run(5, { level: 0.001, fuzz: 12 }))).toBeLessThan(0.05);
  });

  it('the noise gate mutes a quiet signal but passes a loud one', async () => {
    const quiet = peak(await run(0.5, { gate: 0.3 }));
    const loud = peak(await run(5, { gate: 0.3 }));
    expect(quiet).toBeLessThan(0.05);
    expect(loud).toBeGreaterThan(1);
  });

  it('SILICON is measurably brighter than GERMANIUM at the same FUZZ', async () => {
    // A moderate FUZZ keeps both modes short of full clipping, where the knee shape
    // (and not just the ceiling) is what tells silicon and germanium apart.
    const ge = harmonics(await run(5, { fuzz: 0.5, mode: 0 }));
    const si = harmonics(await run(5, { fuzz: 0.5, mode: 1 }));
    expect(si).toBeGreaterThan(ge * 3);
  });
});
