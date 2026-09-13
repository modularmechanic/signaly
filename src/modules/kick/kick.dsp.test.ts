import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** Trigger once (unless `silent`), then render `secs` seconds into one array. */
async function render(p: Record<string, number>, secs: number, silent = false): Promise<Float32Array> {
  const k = await loadProcessor('kick', p);
  const n = 128;
  const blocks = Math.ceil((secs * SR) / n);
  const hi = new Float32Array(n).fill(5);
  const lo = new Float32Array(n);
  const O = [[new Float32Array(n)]];
  const all = new Float32Array(blocks * n);
  for (let b = 0; b < blocks; b++) {
    k.process([[!silent && b === 0 ? hi : lo], [], []], O);
    all.set(O[0]?.[0] ?? new Float32Array(n), b * n);
  }
  return all;
}

/** Samples between successive upward zero crossings. */
function periods(x: Float32Array): number[] {
  const out: number[] = [];
  let prevIdx = -1;
  for (let i = 1; i < x.length; i++) {
    if ((x[i] ?? 0) > 0 && (x[i - 1] ?? 0) <= 0) {
      if (prevIdx >= 0) out.push(i - prevIdx);
      prevIdx = i;
    }
  }
  return out;
}

const peak = (x: Float32Array): number => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const rms = (x: Float32Array, from: number, to: number): number => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (x[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
};

describe('kick.dsp', () => {
  it('is silent until triggered', async () => {
    const quiet = await render({ tune: 50, click: 1, drive: 1, level: 1 }, 1, true);
    expect(peak(quiet)).toBe(0);
  });

  it('sweeps its pitch down over PITCH DECAY', async () => {
    const p = periods(await render({ tune: 50, pdec: 0.04, adec: 1.5, click: 0, drive: 0, level: 1 }, 0.5));
    expect(p.length).toBeGreaterThan(8);
    // 50 Hz x (1 + 4) at the transient => ~192 samples; 50 Hz once settled => ~960.
    expect(p[0]).toBeLessThan(300);
    expect(p.at(-1)).toBeGreaterThan(800);
    expect(p.every((v, i) => i === 0 || v >= (p[i - 1] ?? 0))).toBe(true);
  });

  it('holds its level for as long as AMP DECAY says', async () => {
    const short = await render({ tune: 50, pdec: 0.04, adec: 0.05, click: 0, drive: 0, level: 1 }, 0.4);
    const long = await render({ tune: 50, pdec: 0.04, adec: 1.5, click: 0, drive: 0, level: 1 }, 0.4);
    const win = [Math.round(0.2 * SR), Math.round(0.3 * SR)] as const;
    expect(rms(long, win[0], win[1])).toBeGreaterThan(1);
    expect(rms(short, win[0], win[1])).toBeLessThan(rms(long, win[0], win[1]) / 50);
    // Both start loud: the difference is the tail, not the hit.
    expect(rms(short, 0, 2000)).toBeGreaterThan(1);
  });

  it('never leaves the +/-5 V audio range under full drive', async () => {
    const hot = await render({ tune: 200, pdec: 0.3, adec: 2, click: 1, drive: 1, level: 1 }, 0.5);
    expect(peak(hot)).toBeLessThanOrEqual(5);
    expect(hot.every(Number.isFinite)).toBe(true);
  });
});
