import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** Goertzel magnitude of `f` Hz within one block of `buf`. */
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

const rms = (b: Float32Array): number => Math.sqrt(b.reduce((s, v) => s + v * v, 0) / b.length);

/** One triggered pluck at 220 Hz, `dec` seconds of DECAY, for `n` samples. */
async function pluck(dec: number, n: number): Promise<Float32Array> {
  const p = await loadProcessor('pluck', { tune: 220, damp: 8000, bright: 0.8, dec, tcvA: 0 });
  const voct = new Float32Array(n); // 0 V: TUNE sets the pitch directly
  const trig = new Float32Array(n);
  trig[0] = 5;
  const out = new Float32Array(n);
  p.process([[voct], [trig], []], [[out]]);
  return out;
}

describe('pluck.dsp', () => {
  it('is silent with no trigger', async () => {
    const p = await loadProcessor('pluck', { tune: 220, damp: 8000, bright: 0.8, dec: 1, tcvA: 0 });
    const n = 2000;
    const voct = new Float32Array(n);
    const trig = new Float32Array(n); // never fires
    const out = new Float32Array(n);
    p.process([[voct], [trig], []], [[out]]);
    expect(rms(out)).toBe(0);
  });

  it('rings at the tuned frequency and DECAY sets the ring time', async () => {
    const n = SR;
    const long = await pluck(0.6, n);
    const short = await pluck(0.15, n);

    // rings at the tuned frequency: the 220 Hz component dominates the ringing energy
    const early = long.slice(1000, 1000 + 2048);
    expect(rms(early)).toBeGreaterThan(0.2);
    expect(mag(early, 220) / rms(early)).toBeGreaterThan(0.35);

    // DECAY sets the ring time: at the same point in time, the shorter DECAY has mostly died
    // out while the longer one is still clearly ringing.
    const at = Math.round(SR * 0.1);
    const win = 1024;
    const rmsLong = rms(long.slice(at, at + win));
    const rmsShort = rms(short.slice(at, at + win));
    expect(rmsLong).toBeGreaterThan(0.05);
    expect(rmsShort).toBeLessThan(rmsLong * 0.2);
  });
});
