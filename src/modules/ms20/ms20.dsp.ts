import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

// Korg35-style 2-pole Sallen-Key. Unlike the TPT cores in SVF/WASP/MORPH, this is the naive
// two-integrator loop with resonance fed straight back around both stages — and the feedback
// tap runs through a clipper before it re-enters the loop. That clip is the point: driven hard
// the loop goes unstable (a growing sinusoid) and the clip is what keeps it from diverging,
// landing on the screaming, self-oscillating limit cycle the MS-20 is known for.
class Ms20 extends Base {
  bp = 0;
  lp = 0;

  defaults(): Params {
    return { cut: 900, res: 0.4, cvA: 0, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 900, res = 0.4, mode = 0 } = this.p;
    const k = 4.3 * clamp(res, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 20, sampleRate * 0.4);
      const g = lpCoeff(fc);
      const x = (inp?.[i] ?? 0) / 5;
      const fb = Math.tanh(k * this.bp); // the resonance path clips before feeding back
      const hp = x - this.lp - fb;
      this.bp = flush(this.bp + g * hp);
      this.lp = flush(this.lp + g * this.bp);
      out[i] = clamp((mode ? hp : this.lp) * 5, -5, 5);
    }
    return true;
  }
}

registerProcessor('ms20', Ms20);
