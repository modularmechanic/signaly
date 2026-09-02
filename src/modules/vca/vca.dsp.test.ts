import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

interface Proc {
  p: Params;
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
let Ctor: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./vca.dsp');
  Ctor = reg.mock.calls[0]?.[1] as new () => Proc;
});

const run = (p: Partial<Params>, cv: number | null): Float32Array => {
  const v = new Ctor();
  Object.assign(v.p, p);
  const sig = new Float32Array(8).fill(5);
  const cvBuf = cv === null ? [] : [new Float32Array(8).fill(cv)];
  const O = [[new Float32Array(8)], [new Float32Array(8)]];
  v.process([[sig], cvBuf, [], []], O);
  return O[0]![0]!;
};

describe('vca.dsp', () => {
  it('silences the channel at gain 0', () => {
    expect(Array.from(run({ g1: 0 }, null))).toEqual(Array<number>(8).fill(0));
  });

  it('passes unity with the level at 1 and no CV patched', () => {
    expect(Array.from(run({ g1: 1 }, null))).toEqual(Array<number>(8).fill(5));
  });

  it('a patched 0 V CV closes the amplifier', () => {
    expect(run({ g1: 1 }, 0)[0]).toBe(0);
  });

  it('a patched 5 V CV opens it fully', () => {
    expect(run({ g1: 1 }, 5)[0]).toBeCloseTo(5);
  });
});
