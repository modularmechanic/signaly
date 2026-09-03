import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

/** Weighted coin flip latched on each GATE rising edge and held for the whole gate (so a
    wide pulse cannot re-flip mid-gate). BIAS is the chance of routing to B: 0 always A,
    1 always B, guarded explicitly so the extremes never depend on the RNG's exact range. */
class Bern extends Base {
  lg = 0;
  toB = false;
  rng = new Lcg(731);

  defaults(): Params {
    return { bias: 0.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const a = O[0]?.[0];
    const b = O[1]?.[0];
    if (!a || !b) return true;
    const g = ch(I, 0);
    const bcv = ch(I, 1);
    const p = this.p;
    for (let i = 0; i < a.length; i++) {
      const gv = g?.[i] ?? 0;
      if (gv > 2.5 && this.lg <= 2.5) {
        const bias = clamp((p.bias ?? 0.5) + (bcv?.[i] ?? 0) / 5, 0, 1);
        this.toB = bias >= 1 ? true : bias <= 0 ? false : (this.rng.next() + 1) / 2 < bias;
      }
      this.lg = gv;
      const hi = gv > 2.5;
      a[i] = hi && !this.toB ? 5 : 0;
      b[i] = hi && this.toB ? 5 : 0;
    }
    return true;
  }
}

registerProcessor('bern', Bern);
