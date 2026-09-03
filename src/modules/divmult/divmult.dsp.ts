import { Base, ch, ClockSync, type Params } from '../../engine/dsp-prelude';

const OUTS = 6; // d8 d4 d2 m2 m3 m4

/** ÷8 ÷4 ÷2 ×2 ×3 ×4 from one external clock. The divides count edges; the multiplies
    subdivide the live period ClockSync measures between edges, so ×N locks on to N evenly
    spaced pulses per input clock once a period has been observed (the very first clock
    only gives the edge-aligned pulse — there is no period yet to subdivide). */
class DivMult extends Base {
  clk = new ClockSync();
  lc = 0;
  lr = 0;
  since = 0;
  cnt8 = 0;
  cnt4 = 0;
  cnt2 = 0;
  next = [1, 1, 1]; // next pulse index (of N) still owed for m2/m3/m4 this period
  hi = new Array(OUTS).fill(0) as number[];
  pw = 0;

  defaults(): Params {
    return {};
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const outs = [O[0]?.[0], O[1]?.[0], O[2]?.[0], O[3]?.[0], O[4]?.[0], O[5]?.[0]];
    if (outs.some((o) => !o)) return true;
    if (!this.pw) this.pw = Math.max(1, (sampleRate * 0.005) | 0);
    const c0 = ch(I, 0);
    const r0 = ch(I, 1);
    const n = outs[0]!.length;
    for (let i = 0; i < n; i++) {
      const r = r0?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) {
        this.cnt8 = 0;
        this.cnt4 = 0;
        this.cnt2 = 0;
      }
      this.lr = r;
      const c = c0?.[i] ?? 0;
      const period = this.clk.tick(c);
      if (c > 2.5 && this.lc <= 2.5) {
        this.since = 0;
        this.next = [1, 1, 1];
        if (this.cnt8 === 0) this.hi[0] = this.pw;
        this.cnt8 = (this.cnt8 + 1) % 8;
        if (this.cnt4 === 0) this.hi[1] = this.pw;
        this.cnt4 = (this.cnt4 + 1) % 4;
        if (this.cnt2 === 0) this.hi[2] = this.pw;
        this.cnt2 = (this.cnt2 + 1) % 2;
        // First of N pulses for every multiply output fires right on the input edge.
        this.hi[3] = this.pw;
        this.hi[4] = this.pw;
        this.hi[5] = this.pw;
      }
      this.lc = c;
      this.since++;
      if (period > 0) {
        const mults = [2, 3, 4];
        for (let k = 0; k < 3; k++) {
          const m = mults[k]!;
          const nx = this.next[k]!;
          if (nx < m && this.since >= nx * (period / m)) {
            this.hi[3 + k] = this.pw;
            this.next[k] = nx + 1;
          }
        }
      }
      for (let k = 0; k < OUTS; k++) {
        outs[k]![i] = this.hi[k]! > 0 ? 5 : 0;
        if (this.hi[k]! > 0) this.hi[k] = this.hi[k]! - 1;
      }
    }
    return true;
  }
}

registerProcessor('divmult', DivMult);
