import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** OP-AMP CLIPPER + TONE: a cubic soft clip (the classic op-amp overdrive knee, bounded to
    ±2/3 rather than flattening hard) feeding a one-knob tone stack that crossfades between
    a lowpass and its highpass complement — TONE can invert which end of the spectrum leads,
    unlike DIST's single lowpass which only ever rolls highs off. */
class Overdrive extends Base {
  lp = 0;
  lpA = lpCoeff(700);

  defaults(): Params {
    return { drive: 2, tone: 0.5, level: 0.8 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      dcv = ch(I, 1),
      tocv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const level = clamp(p.level ?? 0.8, 0, 1.4);
    for (let i = 0; i < out.length; i++) {
      const drv = clamp((p.drive ?? 2) * Math.pow(2, (dcv?.[i] ?? 0) / 5), 0.15, 20);
      const tone = clamp((p.tone ?? 0.5) + (tocv?.[i] ?? 0) / 5, 0, 1);
      const x = (inp?.[i] ?? 0) / 5;
      const u = clamp(x * drv, -1, 1);
      const y = u - (u * u * u) / 3;
      this.lp = flush(this.lp + (y - this.lp) * this.lpA);
      const hp = y - this.lp;
      const tonal = this.lp * (1 - tone) + hp * tone * 2.5;
      out[i] = clamp(tonal * 5 * 1.5 * level, -5, 5);
    }
    return true;
  }
}
registerProcessor('overdrive', Overdrive);
