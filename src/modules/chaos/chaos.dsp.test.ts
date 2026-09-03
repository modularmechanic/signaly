import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
  x: number;
}
let Chaos: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./chaos.dsp');
  Chaos = reg.mock.calls[0]![1] as new () => Proc;
});

const N = 48000;

/** X output for a Lorenz run started at `x0`. */
function run(x0: number): Float32Array {
  const c = new Chaos();
  c.x = x0;
  const O = [[new Float32Array(N)], [new Float32Array(N)], [new Float32Array(N)]];
  c.process([[]], O);
  return O[0]![0]!;
}

describe('chaos.dsp', () => {
  it('repeats exactly from the same state and diverges from a state 1e-6 away', () => {
    const a = run(0.1);
    const b = run(0.1);
    const c = run(0.1 + 1e-6);
    let same = 0,
      apart = 0;
    for (let i = 0; i < N; i++) {
      same = Math.max(same, Math.abs(a[i]! - b[i]!));
      apart = Math.max(apart, Math.abs(a[i]! - c[i]!));
    }
    expect(same).toBe(0);
    expect(apart).toBeGreaterThan(1);
  });

  it('stays on the attractor: bounded, non-constant, inside +-5 V', () => {
    const y = run(0.1);
    let lo = Infinity,
      hi = -Infinity;
    for (let i = N / 2; i < N; i++) {
      lo = Math.min(lo, y[i]!);
      hi = Math.max(hi, y[i]!);
    }
    expect(hi - lo).toBeGreaterThan(1);
    expect(hi).toBeLessThanOrEqual(5);
    expect(lo).toBeGreaterThanOrEqual(-5);
  });
});
