import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

class Dist extends Base {
  lp = 0;

  defaults(): Params {
    return { drive: 3, tone: 5000, mode: 0, level: 0.8 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      dcv = ch(I, 1),
      tocv = ch(I, 2),
      lcv = ch(I, 3);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const mode = p.mode ?? 0;
    for (let i = 0; i < out.length; i++) {
      const tone = clamp((p.tone ?? 5000) * Math.pow(2, (tocv?.[i] ?? 0) / 5), 150, 17000);
      const tc = lpCoeff(tone);
      const drv = clamp((p.drive ?? 3) * Math.pow(2, ((dcv?.[i] ?? 0) / 5) * 1.5), 0.3, 24);
      let x = ((inp?.[i] ?? 0) / 5) * drv;
      if (mode === 0) x = Math.tanh(x);
      else if (mode === 1) x = Math.abs(((((x * 0.25 + 0.75) % 2) + 2) % 2) - 1) * 2 - 1; // fold
      else x = clamp(x, -1, 1);
      this.lp = flush(this.lp + (x - this.lp) * tc);
      const lvl = clamp((p.level ?? 0.8) + (lcv?.[i] ?? 0) / 5, 0, 1.4);
      out[i] = this.lp * 5 * lvl;
    }
    return true;
  }
}
registerProcessor('dist', Dist);
