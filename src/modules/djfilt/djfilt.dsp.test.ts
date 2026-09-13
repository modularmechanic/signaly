import { describe, expect, it } from 'vitest';
import { loadProcessor, SR } from '../../../tests/dsp-harness';

/** RMS of the second half of the output for a `hz` tone at the given SWEEP position. */
async function rmsAt(sweep: number, hz: number): Promise<number> {
  const f = await loadProcessor('djfilt', { sweep, cvA: 0 });
  const n = 9600;
  const inp = new Float32Array(n);
  for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * hz * i) / SR) * 4;
  const out = new Float32Array(n);
  f.process([[inp]], [[out]]);
  let sum = 0;
  for (let i = n / 2; i < n; i++) sum += (out[i] ?? 0) * (out[i] ?? 0);
  return Math.sqrt(sum / (n / 2));
}

const LOW = 100;
const HIGH = 8000;

describe('djfilt.dsp', () => {
  it('is transparent at centre', async () => {
    const low = await rmsAt(0, LOW);
    const high = await rmsAt(0, HIGH);
    // both ends pass through close to full level, not just close to each other
    expect(low).toBeGreaterThan(2.5);
    expect(high).toBeGreaterThan(2.2);
  });

  it('sweeps a low pass one way, attenuating the high end', async () => {
    const low = await rmsAt(-1, LOW);
    const high = await rmsAt(-1, HIGH);
    expect(low).toBeGreaterThan(high * 10);
  });

  it('sweeps a high pass the other way, attenuating the low end', async () => {
    const low = await rmsAt(1, LOW);
    const high = await rmsAt(1, HIGH);
    expect(high).toBeGreaterThan(low * 10);
  });
});
