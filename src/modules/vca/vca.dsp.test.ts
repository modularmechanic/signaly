import { describe, expect, it } from 'vitest';
import type { Params } from '../../engine/dsp-prelude';
import { loadProcessor } from '../../../tests/dsp-harness';

const run = async (p: Params, cv: number | null): Promise<Float32Array> => {
  const v = await loadProcessor('vca', p);
  const sig = new Float32Array(8).fill(5);
  const cvBuf = cv === null ? [] : [new Float32Array(8).fill(cv)];
  const O = [[new Float32Array(8)], [new Float32Array(8)]];
  v.process([[sig], cvBuf, [], []], O);
  return O[0]![0]!;
};

describe('vca.dsp', () => {
  it('silences the channel at gain 0', async () => {
    expect(Array.from(await run({ g1: 0 }, null))).toEqual(Array<number>(8).fill(0));
  });

  it('passes unity with the level at 1 and no CV patched', async () => {
    expect(Array.from(await run({ g1: 1 }, null))).toEqual(Array<number>(8).fill(5));
  });

  it('a patched 0 V CV closes the amplifier', async () => {
    expect((await run({ g1: 1 }, 0))[0]).toBe(0);
  });

  it('a patched 5 V CV opens it fully', async () => {
    expect((await run({ g1: 1 }, 5))[0]).toBeCloseTo(5);
  });
});
