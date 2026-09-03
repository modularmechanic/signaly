import { beforeAll, describe, expect, it, vi } from 'vitest';

class FakeProcessor {
  port = { onmessage: null, postMessage: (): void => {} };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  p: Record<string, number>;
}
let Matrix: new () => Proc;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./matrix.dsp');
  Matrix = reg.mock.calls[0]![1] as new () => Proc;
});

const N = 32;
const held = (v: number): Float32Array[] => [new Float32Array(N).fill(v)];

/** The four bus levels for held inputs A..D and a set of open cells. */
function buses(cells: Record<string, number>, ins: number[]): number[] {
  const m = new Matrix();
  Object.assign(m.p, cells);
  const O = [0, 1, 2, 3].map(() => [new Float32Array(N)]);
  m.process(
    ins.map((v) => held(v)),
    O,
  );
  return O.map((o) => o[0]![N - 1]!);
}

describe('matrix.dsp', () => {
  it('routes an input only through the cells that are open', () => {
    expect(buses({ a2: 1 }, [4, 0, 0, 0])).toEqual([0, 4, 0, 0]);
    // the same input, same bus, but now at half level and joined by C
    expect(buses({ a2: 0.5, c2: 0.5 }, [4, 0, 2, 0])).toEqual([0, 3, 0, 0]);
  });

  it('is silent with every cell closed', () => {
    expect(buses({}, [5, -5, 5, -5])).toEqual([0, 0, 0, 0]);
  });

  it('sends one input to several buses at once and clamps the sum to the rail', () => {
    expect(buses({ b1: 1, b3: 0.25 }, [0, 4, 0, 0])).toEqual([4, 0, 1, 0]);
    expect(buses({ a1: 1, b1: 1, c1: 1 }, [4, 4, 4, 0])).toEqual([5, 0, 0, 0]);
  });
});
