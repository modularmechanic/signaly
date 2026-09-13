import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

const N = 1000;
/** -5 V to +5 V over N samples: sample i sits at -5 + 10i/(N-1). */
const RAMP = Float32Array.from({ length: N }, (_, i) => -5 + (10 * i) / (N - 1));
/** Volt v is reached at this sample index. */
const at = (v: number): number => Math.ceil(((v + 5) / 10) * (N - 1));

async function sweep(
  p: Record<string, number>,
  cv?: number,
): Promise<[Float32Array, Float32Array, Float32Array]> {
  const c = await loadProcessor('compare', p);
  const O = [0, 1, 2].map(() => [new Float32Array(N)]);
  const cvIn = cv === undefined ? [] : [new Float32Array(N).fill(cv)];
  c.process([[RAMP], cvIn], O);
  return [O[0]![0]!, O[1]![0]!, O[2]![0]!];
}

/** [first sample the gate is high, first sample it is low again]. */
function edges(g: Float32Array): [number, number] {
  const open = g.indexOf(5);
  let shut = open;
  while (shut < g.length && g[shut] === 5) shut++;
  return [open, shut];
}

describe('compare.dsp', () => {
  it('opens on entry to the window and closes on exit', async () => {
    const [gate] = await sweep({ centre: 1, width: 2 });
    const [open, shut] = edges(gate);
    expect(open).toBe(at(0)); // lo edge = centre - width/2
    expect(shut).toBe(at(2)); // hi edge = centre + width/2, exclusive
  });

  it('shifts the whole window with CENTRE CV', async () => {
    const [gate] = await sweep({ centre: 1, width: 2 }, 2);
    const [open, shut] = edges(gate);
    expect(open).toBe(at(2));
    expect(shut).toBe(at(4));
  });

  it('keeps GATE, ABOVE and BELOW mutually exclusive across the sweep', async () => {
    const [gate, above, below] = await sweep({ centre: -1.5, width: 3 });
    let bad = 0;
    let highs = 0;
    for (let i = 0; i < N; i++) {
      const sum = gate[i]! + above[i]! + below[i]!;
      if (sum !== 5) bad++;
      if (gate[i] === 5) highs++;
    }
    expect(bad).toBe(0);
    // a 3 V window over a 10 V sweep is 30% of the samples
    expect(highs).toBeGreaterThan(N * 0.28);
    expect(highs).toBeLessThan(N * 0.32);
  });
});
