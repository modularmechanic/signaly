import { Base, ch, clamp, oscW, type Params } from '../../engine/dsp-prelude';

class Duo extends Base {
  p1 = 0;
  p2 = Math.random();

  defaults(): Params {
    return { oct: 0, semi: 0, det: 6, mix: 0.5, w1: 2, w2: 2, sync: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      fm = ch(I, 1),
      mxc = ch(I, 2);
    const o1o = O[0]?.[0],
      o2o = O[1]?.[0],
      mxo = O[2]?.[0];
    if (!o1o || !o2o || !mxo) return true;
    const { oct = 0, semi = 0, det = 6, mix = 0.5, w1 = 2, w2 = 2, sync = 0 } = this.p;
    for (let i = 0; i < o1o.length; i++) {
      const v = oct + (vo?.[i] ?? 0) + (fm?.[i] ?? 0) * 0.2;
      const f1 = clamp(261.626 * Math.pow(2, v), 0.1, sampleRate * 0.45);
      const f2 = clamp(261.626 * Math.pow(2, v + semi / 12 + det / 1200), 0.1, sampleRate * 0.45);
      const d1 = f1 / sampleRate,
        d2 = f2 / sampleRate;
      this.p1 += d1;
      if (this.p1 >= 1) {
        this.p1 -= 1;
        // hard sync: carry osc 1's phase overshoot into osc 2's own rate
        if (sync) this.p2 = (this.p1 / d1) * d2;
      }
      this.p2 += d2;
      if (this.p2 >= 1) this.p2 -= 1;
      const a = oscW(w1 | 0, this.p1, d1) * 5;
      const b = oscW(w2 | 0, this.p2, d2) * 5;
      const m = clamp(mix + (mxc?.[i] ?? 0) / 10, 0, 1);
      o1o[i] = a;
      o2o[i] = b;
      mxo[i] = a * (1 - m) + b * m;
    }
    return true;
  }
}

registerProcessor('duo', Duo);
