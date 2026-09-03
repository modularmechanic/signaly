import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** The two extremes SWEEP interpolates between: near-transparent, and a hard 1-pole roll-off. */
const LO_HZ = 30;
const HI_HZ = 18000;

// A single one-pole stage doing double duty: centre is wide open in both directions (near
// unity), left of centre it closes down as a low pass, right of centre it closes down as a
// high pass — one knob, one filter, two roles, unlike every other module in the batch which
// dedicates a switch or a jack to picking the mode.
class DjFilt extends Base {
  lp = 0;

  defaults(): Params {
    return { sweep: 0, cvA: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { sweep = 0 } = this.p;
    const k = clamp(sweep + (cv?.[0] ?? 0) / 5, -1, 1);
    const lowPass = k <= 0;
    const fc = lowPass ? HI_HZ * Math.pow(LO_HZ / HI_HZ, -k) : LO_HZ * Math.pow(HI_HZ / LO_HZ, k);
    const g = lpCoeff(clamp(fc, LO_HZ, HI_HZ));
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      this.lp = flush(this.lp + g * (x - this.lp));
      out[i] = clamp(lowPass ? this.lp : x - this.lp, -5, 5);
    }
    return true;
  }
}

registerProcessor('djfilt', DjFilt);
