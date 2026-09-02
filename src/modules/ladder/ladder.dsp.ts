import { Base, ch, clamp, lpCoeff, type Params } from '../../engine/dsp-prelude';

// Four one-pole stages with tanh in the feedback path — the transistor ladder.
class Ladder extends Base {
  s1 = 0;
  s2 = 0;
  s3 = 0;
  s4 = 0;

  defaults(): Params {
    return { cut: 1200, res: 0.2, drive: 1, cv: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      rcv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { cut = 1200, res = 0.2, drive = 1 } = this.p;
    const norm = Math.max(1, drive * 0.6);
    for (let i = 0; i < out.length; i++) {
      const x = ((inp?.[i] ?? 0) / 5) * drive;
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 15, sampleRate * 0.35);
      const g = lpCoeff(fc);
      const k = 4.2 * clamp(res + (rcv?.[i] ?? 0) / 5, 0, 1);
      const u = Math.tanh(x - k * this.s4);
      this.s1 += g * (u - this.s1);
      this.s2 += g * (this.s1 - this.s2);
      this.s3 += g * (this.s2 - this.s3);
      this.s4 += g * (this.s3 - this.s4);
      out[i] = (this.s4 * 5) / norm;
    }
    return true;
  }
}

registerProcessor('ladder', Ladder);
