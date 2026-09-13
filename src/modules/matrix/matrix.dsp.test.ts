import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

const N = 32;
const held = (v: number): Float32Array[] => [new Float32Array(N).fill(v)];

/** The four bus levels for held inputs A..D and a set of open cells. */
async function buses(cells: Record<string, number>, ins: number[]): Promise<number[]> {
  const m = await loadProcessor('matrix', cells);
  const O = [0, 1, 2, 3].map(() => [new Float32Array(N)]);
  m.process(
    ins.map((v) => held(v)),
    O,
  );
  return O.map((o) => o[0]![N - 1]!);
}

describe('matrix.dsp', () => {
  it('routes an input only through the cells that are open', async () => {
    expect(await buses({ a2: 1 }, [4, 0, 0, 0])).toEqual([0, 4, 0, 0]);
    // the same input, same bus, but now at half level and joined by C
    expect(await buses({ a2: 0.5, c2: 0.5 }, [4, 0, 2, 0])).toEqual([0, 3, 0, 0]);
  });

  it('is silent with every cell closed', async () => {
    expect(await buses({}, [5, -5, 5, -5])).toEqual([0, 0, 0, 0]);
  });

  it('sends one input to several buses at once and clamps the sum to the rail', async () => {
    expect(await buses({ b1: 1, b3: 0.25 }, [0, 4, 0, 0])).toEqual([4, 0, 1, 0]);
    expect(await buses({ a1: 1, b1: 1, c1: 1 }, [4, 4, 4, 0])).toEqual([5, 0, 0, 0]);
  });
});
