import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

/** Sweep 0 V -> 2 V (two octaves) and collect the OUT plateaus plus CHANGE edges. */
async function ramp(p: Record<string, number>): Promise<{ notes: number[]; changes: number }> {
  const q = await loadProcessor('quant', p);
  const blocks = 750;
  const n = 128;
  const total = blocks * n;
  const out = [new Float32Array(n)];
  const chg = [new Float32Array(n)];
  const inp = new Float32Array(n);
  const notes: number[] = [];
  let changes = 0;
  let prevChange = 0;
  for (let b = 0; b < blocks; b++) {
    for (let i = 0; i < n; i++) inp[i] = ((b * n + i) / total) * 2;
    q.process([[inp], []], [out, chg]);
    for (let i = 0; i < n; i++) {
      const v = out[0]?.[i] ?? 0;
      if (notes.at(-1) !== v) notes.push(v);
      const c = chg[0]?.[i] ?? 0;
      if (c > 2.5 && prevChange <= 2.5) changes++;
      prevChange = c;
    }
  }
  return { notes, changes };
}

/** Semitones above the root, folded into one octave. */
const degreesOf = (notes: number[], root: number): number[] =>
  notes.map((v) => (((Math.round(v * 12) - root) % 12) + 12) % 12);

describe('quant.dsp', () => {
  it('emits only degrees of the selected scale across two octaves', async () => {
    const major = degreesOf((await ramp({ scale: 1, root: 0, transpose: 0, glide: 0.02 })).notes, 0);
    expect(major.every((d) => [0, 2, 4, 5, 7, 9, 11].includes(d))).toBe(true);
    expect(new Set(major).size).toBe(7);

    const penta = degreesOf((await ramp({ scale: 4, root: 3, transpose: 0, glide: 0.02 })).notes, 3);
    expect(penta.every((d) => [0, 2, 4, 7, 9].includes(d))).toBe(true);
    expect(new Set(penta).size).toBe(5);
  });

  it('lands on whole tones only, and follows ROOT and TRANSPOSE', async () => {
    const whole = (await ramp({ scale: 5, root: 1, transpose: 5, glide: 0.02 })).notes;
    // TRANSPOSE is applied after quantising, so it shifts every note by exactly 5 st.
    expect(
      whole.every((v) => [0, 2, 4, 6, 8, 10].includes((((Math.round(v * 12) - 5 - 1) % 12) + 12) % 12)),
    ).toBe(true);
  });

  it('fires CHANGE exactly once per new note', async () => {
    const { notes, changes } = await ramp({ scale: 1, root: 0, transpose: 0, glide: 0.02 });
    expect(notes.length).toBeGreaterThan(10);
    expect(changes).toBe(notes.length - 1);
  });

  it('samples only on a trigger when TRIG is patched', async () => {
    const q = await loadProcessor('quant', { scale: 0, root: 0, transpose: 0, glide: 0.001 });
    const n = 128;
    const out = [new Float32Array(n)];
    const chg = [new Float32Array(n)];
    const inp = new Float32Array(n).fill(1);
    const low = new Float32Array(n);
    const hi = new Float32Array(n).fill(5);
    for (let b = 0; b < 40; b++) q.process([[inp], [low]], [out, chg]);
    expect(out[0]?.[n - 1] ?? 9).toBe(0); // held at 0 V: no edge has arrived
    q.process([[inp], [hi]], [out, chg]);
    for (let b = 0; b < 40; b++) q.process([[inp], [low]], [out, chg]);
    expect(out[0]?.[n - 1] ?? 0).toBeCloseTo(1, 5);
  });
});
