import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let SSwitch: Ctor;
const N = 64;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./sswitch.dsp');
  SSwitch = reg.mock.calls[0]![1] as Ctor;
});

const buf = (v = 0): Float32Array => new Float32Array(N).fill(v);

/** Run one block and return the last sample of each of the four outputs. */
function tick(s: Proc, clk: Float32Array, rst: Float32Array, ins: Float32Array[]): number[] {
  const O = Array.from({ length: 4 }, () => [new Float32Array(N)]);
  s.process([[clk], [rst], ...ins.map((b) => [b])], O);
  return O.map((o) => o[0]?.[N - 1] ?? 0);
}

describe('sswitch.dsp', () => {
  it('walks IN 1 across the outputs and resets to the first', () => {
    const s = new SSwitch({ processorOptions: { p: { steps: 4, dir: 0 } } });
    const hi = buf(5);
    const lo = buf();
    const sig = buf(3);
    const ins = [sig, buf(), buf(), buf()];
    const seen: number[][] = [tick(s, lo, lo, ins)];
    for (let k = 0; k < 4; k++) {
      seen.push(tick(s, hi, lo, ins));
      tick(s, lo, lo, ins);
    }
    // Idle on OUT 1, then one channel per clock, wrapping back to OUT 1.
    expect(seen).toEqual([
      [3, 0, 0, 0],
      [0, 3, 0, 0],
      [0, 0, 3, 0],
      [0, 0, 0, 3],
      [3, 0, 0, 0],
    ]);
    tick(s, hi, lo, ins);
    expect(tick(s, lo, hi, ins)).toEqual([3, 0, 0, 0]);
  });

  it('honours STEPS, wrapping early at 2', () => {
    const s = new SSwitch({ processorOptions: { p: { steps: 2, dir: 0 } } });
    const hi = buf(5);
    const lo = buf();
    const ins = [buf(4), buf(), buf(), buf()];
    const seen: number[][] = [];
    for (let k = 0; k < 3; k++) {
      seen.push(tick(s, hi, lo, ins));
      tick(s, lo, lo, ins);
    }
    expect(seen).toEqual([
      [0, 4, 0, 0],
      [4, 0, 0, 0],
      [0, 4, 0, 0],
    ]);
  });

  it('collects IN 1–4 into OUT 1 in the 4→1 direction', () => {
    const s = new SSwitch({ processorOptions: { p: { steps: 4, dir: 1 } } });
    const hi = buf(5);
    const lo = buf();
    const ins = [buf(1), buf(2), buf(3), buf(4)];
    const seen: number[] = [tick(s, lo, lo, ins)[0] ?? 0];
    for (let k = 0; k < 3; k++) {
      seen.push(tick(s, hi, lo, ins)[0] ?? 0);
      tick(s, lo, lo, ins);
    }
    expect(seen).toEqual([1, 2, 3, 4]);
    expect(tick(s, lo, lo, ins).slice(1)).toEqual([0, 0, 0]);
  });
});
