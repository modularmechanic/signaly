import { Base, ch, clamp, DL, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

class Comb extends Base {
  dl = new DL(sampleRate / 8);
  lp = 0;

  defaults(): Params {
    return { freq: 220, fb: 0.7, damp: 6000, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      vo = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const { freq = 220, fb = 0.7, damp = 6000, mix = 1 } = this.p;
    const dc = lpCoeff(clamp(damp, 200, 18000));
    const fbc = clamp(fb, -0.99, 0.99);
    for (let i = 0; i < out.length; i++) {
      const f = clamp(freq * Math.pow(2, vo?.[i] ?? 0), 12, 8000);
      const x = inp?.[i] ?? 0;
      const d = this.dl.read(sampleRate / f);
      this.lp = flush(this.lp + (d - this.lp) * dc); // damping state lives in the feedback loop
      const y = clamp(x + this.lp * fbc, -50, 50); // hard ceiling keeps a hot input from blowing up the loop
      this.dl.push(y);
      out[i] = x * (1 - mix) + y * mix * 0.8;
    }
    return true;
  }
}

registerProcessor('comb', Comb);
