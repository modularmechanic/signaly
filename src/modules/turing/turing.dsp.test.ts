import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Turing: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./turing.dsp');
  Turing = reg.mock.calls[0]![1] as Ctor;
});

/** One clock pulse per call; returns the CV held at each step. */
function clocks(p: Record<string, number>, steps: number): number[] {
  const t = new Turing({ processorOptions: { p } });
  const hi = new Float32Array(64).fill(5);
  const lo = new Float32Array(64);
  const O = Array.from({ length: 3 }, () => [new Float32Array(64)]);
  const seq: number[] = [];
  for (let s = 0; s < steps; s++) {
    t.process([[hi], []], O);
    seq.push(O[0]?.[0]?.[63] ?? 0);
    t.process([[lo], []], O);
  }
  return seq;
}

/** Count of positions where the sequence differs from itself `n` clocks later. */
const driftAt = (seq: number[], n: number): number =>
  seq.slice(0, seq.length - n).filter((v, i) => v !== seq[i + n]).length;

describe('turing.dsp', () => {
  it('repeats exactly every LENGTH clocks when PROBABILITY is locked', () => {
    expect(driftAt(clocks({ prob: 1, len: 8, scale: 5, offset: 0 }, 32), 8)).toBe(0);
    expect(driftAt(clocks({ prob: 1, len: 5, scale: 5, offset: 0 }, 25), 5)).toBe(0);
    // A locked LENGTH-5 loop is not also a LENGTH-8 loop.
    expect(driftAt(clocks({ prob: 1, len: 5, scale: 5, offset: 0 }, 32), 8)).toBeGreaterThan(0);
  });

  it('stops repeating at the centre of PROBABILITY', () => {
    expect(driftAt(clocks({ prob: 0.5, len: 8, scale: 5, offset: 0 }, 64), 8)).toBeGreaterThan(4);
  });

  it('locks inverted at PROBABILITY zero: period 2xLENGTH, not LENGTH', () => {
    const seq = clocks({ prob: 0, len: 8, scale: 5, offset: 0 }, 48);
    expect(driftAt(seq, 16)).toBe(0);
    expect(driftAt(seq, 8)).toBeGreaterThan(0);
  });

  it('scales and offsets the CV and gates on the low bit', () => {
    const t = new Turing({ processorOptions: { p: { prob: 1, len: 8, scale: 4, offset: -2 } } });
    const hi = new Float32Array(64).fill(5);
    const gap = new Float32Array(64);
    const O = Array.from({ length: 3 }, () => [new Float32Array(64)]);
    let lo = 9;
    let high = -9;
    let complementary = true;
    for (let s = 0; s < 32; s++) {
      t.process([[hi], []], O);
      const v = O[0]?.[0]?.[63] ?? 0;
      lo = Math.min(lo, v);
      high = Math.max(high, v);
      // GATE and INVERT are complementary while the clock is high.
      if ((O[1]?.[0]?.[63] ?? 0) + (O[2]?.[0]?.[63] ?? 0) !== 5) complementary = false;
      t.process([[gap], []], O);
    }
    expect(complementary).toBe(true);
    expect(lo).toBeGreaterThanOrEqual(-2);
    expect(high).toBeLessThanOrEqual(2);
    expect(high - lo).toBeGreaterThan(1);
  });
});
