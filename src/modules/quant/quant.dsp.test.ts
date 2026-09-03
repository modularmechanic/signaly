import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Quant: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./quant.dsp');
  Quant = reg.mock.calls[0]![1] as Ctor;
});

/** Sweep 0 V -> 2 V (two octaves) and collect the OUT plateaus plus CHANGE edges. */
function ramp(p: Record<string, number>): { notes: number[]; changes: number } {
  const q = new Quant({ processorOptions: { p } });
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
  it('emits only degrees of the selected scale across two octaves', () => {
    const major = degreesOf(ramp({ scale: 1, root: 0, transpose: 0, glide: 0.02 }).notes, 0);
    expect(major.every((d) => [0, 2, 4, 5, 7, 9, 11].includes(d))).toBe(true);
    expect(new Set(major).size).toBe(7);

    const penta = degreesOf(ramp({ scale: 4, root: 3, transpose: 0, glide: 0.02 }).notes, 3);
    expect(penta.every((d) => [0, 2, 4, 7, 9].includes(d))).toBe(true);
    expect(new Set(penta).size).toBe(5);
  });

  it('lands on whole tones only, and follows ROOT and TRANSPOSE', () => {
    const whole = ramp({ scale: 5, root: 1, transpose: 5, glide: 0.02 }).notes;
    // TRANSPOSE is applied after quantising, so it shifts every note by exactly 5 st.
    expect(
      whole.every((v) => [0, 2, 4, 6, 8, 10].includes((((Math.round(v * 12) - 5 - 1) % 12) + 12) % 12)),
    ).toBe(true);
  });

  it('fires CHANGE exactly once per new note', () => {
    const { notes, changes } = ramp({ scale: 1, root: 0, transpose: 0, glide: 0.02 });
    expect(notes.length).toBeGreaterThan(10);
    expect(changes).toBe(notes.length - 1);
  });

  it('samples only on a trigger when TRIG is patched', () => {
    const q = new Quant({ processorOptions: { p: { scale: 0, root: 0, transpose: 0, glide: 0.001 } } });
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
