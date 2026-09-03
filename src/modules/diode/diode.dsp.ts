import { Base, ch, clamp, flush, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** Diodes conduct one way: the positive half saturates hard, the negative half stays soft.
    That asymmetry is what puts even harmonics in the drive path, unlike the transistor
    LADDER's symmetric tanh. */
const diode = (x: number): number => (x > 0 ? Math.tanh(x) : Math.tanh(x * 0.55) / 0.55);

class Diode extends Base {
  s1 = 0;
  s2 = 0;
  s3 = 0;
  s4 = 0;
  bass = 0;

  defaults(): Params {
    return { cut: 1000, res: 0.3, cvA: 0, drive: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      rcv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 1000, res = 0.3, drive = 1 } = this.p;
    const norm = Math.max(1, drive * 0.55);
    for (let i = 0; i < out.length; i++) {
      const x = ((inp?.[i] ?? 0) / 5) * drive;
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 15, sampleRate * 0.35);
      const g = lpCoeff(fc);
      const k = clamp(res + (rcv?.[i] ?? 0) / 5, 0, 1);
      const u = diode(x - 4 * k * this.s4);
      // each stage clips on its own, the way a real diode ladder does
      this.s1 = flush(this.s1 + g * (diode(u) - this.s1));
      this.s2 = flush(this.s2 + g * (diode(this.s1) - this.s2));
      this.s3 = flush(this.s3 + g * (diode(this.s2) - this.s3));
      this.s4 = flush(this.s4 + g * (this.s3 - this.s4));
      // resonance thins the low end: a high pass that opens as RES comes up
      this.bass = flush(this.bass + lpCoeff(20 + k * 260) * (this.s4 - this.bass));
      out[i] = clamp((this.s4 - this.bass * k * 0.9) / norm, -1.4, 1.4) * 5;
    }
    return true;
  }
}

registerProcessor('diode', Diode);
