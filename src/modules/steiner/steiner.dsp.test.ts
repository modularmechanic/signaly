import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** Run `mode` at a fixed 1 kHz cutoff against a `hz` tone and return its Goertzel magnitude. */
async function magAt(mode: number, hz: number): Promise<number> {
  const f = await loadProcessor('steiner', { cut: 1000, res: 0.4, cvA: 0, mode });
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 3;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  const w = (2 * Math.PI * hz) / SR;
  const c = 2 * Math.cos(w);
  let s1 = 0,
    s2 = 0;
  for (const x of out) {
    const s = x + c * s1 - s2;
    s2 = s1;
    s1 = s;
  }
  return (2 * Math.hypot(s1 - s2 * Math.cos(w), s2 * Math.sin(w))) / n;
}

// mode indices: 0 LP, 1 BP, 2 HP, 3 AP
describe('steiner.dsp', () => {
  it('produces four measurably different responses at the same cutoff', async () => {
    const low = 250,
      mid = 1000,
      high = 4000;
    const lp = { low: await magAt(0, low), high: await magAt(0, high) };
    const hp = { low: await magAt(2, low), high: await magAt(2, high) };
    const bp = { low: await magAt(1, low), mid: await magAt(1, mid), high: await magAt(1, high) };
    const ap = { low: await magAt(3, low), mid: await magAt(3, mid), high: await magAt(3, high) };

    // LP: passes below cutoff, cuts well above it
    expect(lp.low).toBeGreaterThan(lp.high * 5);
    // HP: the mirror image
    expect(hp.high).toBeGreaterThan(hp.low * 5);
    // BP: peaks at the cutoff, attenuates both sides
    expect(bp.mid).toBeGreaterThan(bp.low * 5);
    expect(bp.mid).toBeGreaterThan(bp.high * 5);
    // AP: the fourth mode is neither of the above — near-flat magnitude across the sweep,
    // unlike LP/BP/HP which each show a >5x swing somewhere in the same sweep
    const apSpread = Math.max(ap.low, ap.mid, ap.high) / Math.min(ap.low, ap.mid, ap.high);
    expect(apSpread).toBeLessThan(1.3);
  });
});
