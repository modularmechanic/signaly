import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let ADSR: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./adsr.dsp');
  ADSR = reg.mock.calls[0]![1] as new () => Proc;
});

const block = (n: number): Float32Array[][] => [[new Float32Array(n)], [new Float32Array(n)]];

describe('adsr.dsp', () => {
  it('rises on gate high and falls back to zero on gate low', () => {
    const e = new ADSR();
    const n = 9600; // 200 ms, long enough for a 10 ms attack + 250 ms decay to move
    const O = block(n);
    e.process([[new Float32Array(n).fill(5)]], O);
    const held = O[0]![0]![n - 1]!;
    expect(held).toBeGreaterThan(3);
    expect(O[1]![0]![n - 1]!).toBeCloseTo(-held, 5);

    e.p.r = 0.02;
    const R = block(n);
    e.process([[new Float32Array(n)]], R);
    expect(R[0]![0]![n - 1]!).toBeLessThan(held * 0.2);
  });

  it('settles on the sustain level while the gate is held', () => {
    const e = new ADSR();
    const n = 48000 * 3;
    const O = block(n);
    e.process([[new Float32Array(n).fill(5)]], O);
    expect(O[0]![0]![n - 1]!).toBeCloseTo(0.6 * 5, 1);
  });
});
