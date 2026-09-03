import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** Mid-side width. Only the SIDE band is scaled, so L+R is the untouched mid at any
    width — that identity is what mono compatibility means. BASS MONO strips the low
    end out of the side band so the bottom octaves always sit dead centre. */
class Spread extends Base {
  lo = 0;

  defaults(): Params {
    return { width: 1, bass: 120, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inL = ch(I, 0),
      inR = ch(I, 1),
      wcv = ch(I, 2);
    const oL = O[0]?.[0],
      oR = O[1]?.[0];
    if (!oL || !oR) return true;
    const p = this.p;
    const a = lpCoeff(clamp(p.bass ?? 120, 20, 500));
    const mix = clamp(p.mix ?? 1, 0, 1);
    for (let i = 0; i < oL.length; i++) {
      const xl = inL?.[i] ?? 0;
      const xr = inR ? (inR[i] ?? 0) : xl; // R normalled to L, so a mono source stays centred
      const m = (xl + xr) * 0.5;
      const s = (xl - xr) * 0.5;
      this.lo = flush(this.lo + (s - this.lo) * a);
      const w = clamp((p.width ?? 1) + ((wcv?.[i] ?? 0) / 5) * 2, 0, 2);
      const sw = (s - this.lo) * w;
      oL[i] = clamp(xl * (1 - mix) + (m + sw) * mix, -5, 5);
      oR[i] = clamp(xr * (1 - mix) + (m - sw) * mix, -5, 5);
    }
    return true;
  }
}
registerProcessor('spread', Spread);
