import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  msg?(m: { t: string; [k: string]: unknown }): void;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let TrigSeq: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./trigseq.dsp');
  TrigSeq = reg.mock.calls[0]![1] as Ctor;
});

describe('trigseq.dsp', () => {
  it('realigns lanes of length 3 and 4 every 12 clocks (their LCM)', () => {
    const t = new TrigSeq({ processorOptions: { p: { len1: 3, len2: 4, len3: 16, len4: 16 } } });
    // Only step 0 of lane 1 and lane 2 is hit, so both fire together exactly when both
    // lanes are back at position 0 — every LCM(3,4) = 12 clocks.
    const grid = [[1, 0, 0], [1, 0, 0, 0], [0], [0]];
    t.msg?.({ t: 'grid', v: grid });
    const hi = new Float32Array(4).fill(5);
    const lo = new Float32Array(4);
    const O = Array.from({ length: 4 }, () => [new Float32Array(4)]);
    const bothFireAt: number[] = [];
    for (let clock = 1; clock <= 24; clock++) {
      t.process([[hi], []], O);
      const l1 = (O[0]?.[0]?.[3] ?? 0) > 2.5;
      const l2 = (O[1]?.[0]?.[3] ?? 0) > 2.5;
      if (l1 && l2) bothFireAt.push(clock);
      t.process([[lo], []], O);
    }
    expect(bothFireAt).toEqual([12, 24]);
  });
});
