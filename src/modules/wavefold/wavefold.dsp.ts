import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** Triangle fold, period 4, identity on -1..1 and bounded to -1..1 for any input.
    This is the whole difference from DIST: past unity the transfer turns back on
    itself instead of flattening, so drive buys harmonics rather than a plateau. */
const tri = (u: number): number => {
  const q = (((u + 1) % 4) + 4) % 4;
  return q < 2 ? q - 1 : 3 - q;
};

class Wavefold extends Base {
  dc = 0;
  dcA = lpCoeff(5);

  defaults(): Params {
    return { fold: 1, sym: 0, level: 0.8, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      fcv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const sym = p.sym ?? 0;
    const level = p.level ?? 0.8;
    const mix = clamp(p.mix ?? 1, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const fold = clamp((p.fold ?? 1) * Math.pow(2, ((fcv?.[i] ?? 0) / 5) * 2), 0.2, 32);
      let w = tri((x / 5) * fold + sym);
      // SYMMETRY offsets into the fold, which lands DC in the output; strip it.
      this.dc = flush(this.dc + (w - this.dc) * this.dcA);
      w -= this.dc;
      out[i] = clamp(w * 5 * level * mix + x * (1 - mix), -5, 5);
    }
    return true;
  }
}
registerProcessor('wavefold', Wavefold);
