import { describe, expect, it } from 'vitest';
import { loadProcessor } from '../../../tests/dsp-harness';

describe('shift.dsp', () => {
  it("holds OUT 4 at OUT 1's value from three clocks earlier", async () => {
    const s = await loadProcessor('shift');
    s.p.slew = 0.0005; // effectively instant at 48kHz — a clean sample & hold
    const O = [
      [new Float32Array(64)],
      [new Float32Array(64)],
      [new Float32Array(64)],
      [new Float32Array(64)],
    ];
    const o1: number[] = [];
    const o4: number[] = [];
    for (let step = 0; step < 8; step++) {
      const hi = new Float32Array(64).fill(5);
      const inp = new Float32Array(64).fill(step + 1);
      s.process([[inp], [hi]], O);
      // read well after the edge so the one-pole has fully settled
      o1.push(O[0]![0]![63] ?? 0);
      o4.push(O[3]![0]![63] ?? 0);
      const lo = new Float32Array(64);
      s.process([[inp], [lo]], O);
    }
    for (let k = 3; k < 8; k++) {
      expect(o4[k]).toBeCloseTo(o1[k - 3]!, 3);
    }
  });
});
