import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Trem: new () => Proc;

const SR = 48000;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./trem.dsp');
  Trem = reg.mock.calls[0]![1] as new () => Proc;
});

/** Fraction of samples pinned near a gain extreme (0 or full) for a given SHAPE index. */
function extremeFraction(shapeIdx: number): number {
  const t = new Trem();
  t.p.depth = 1;
  t.p.rate = 4;
  t.p.shape = shapeIdx;
  const n = 12000;
  const inp = new Float32Array(n).fill(5);
  const O = [[new Float32Array(n)], [new Float32Array(n)]];
  t.process([[inp]], O);
  const L = O[0]![0]!;
  let extreme = 0;
  for (let i = 0; i < n; i++) {
    const v = L[i]!;
    if (v < 0.5 || v > 4.5) extreme++;
  }
  return extreme / n;
}

describe('trem.dsp', () => {
  it('passes fully dry input through unchanged at depth 0', () => {
    const t = new Trem();
    t.p.depth = 0;
    const n = 512;
    const inp = new Float32Array(n);
    for (let i = 0; i < n; i++) inp[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * 3;
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    t.process([[inp]], O);
    expect(Array.from(O[0]![0]!)).toEqual(Array.from(inp));
    expect(Array.from(O[1]![0]!)).toEqual(Array.from(inp));
  });

  it('auto-pans complementary gains and switches LFO shape', () => {
    const t = new Trem();
    t.p.depth = 1;
    t.p.rate = 4;
    t.p.shape = 0;
    const n = 4800;
    const inp = new Float32Array(n).fill(5);
    const O = [[new Float32Array(n)], [new Float32Array(n)]];
    t.process([[inp]], O);
    const L = O[0]![0]!,
      R = O[1]![0]!;
    for (let i = 0; i < n; i += 97) expect(L[i]! + R[i]!).toBeCloseTo(5, 4);

    // a square LFO spends nearly all its time at the gain extremes; a sine spends much of it
    // in between -- so the extreme-time fraction discriminates the SHAPE switch.
    const sq = extremeFraction(2);
    const sine = extremeFraction(0);
    expect(sq).toBeGreaterThan(sine + 0.3);
  });
});
