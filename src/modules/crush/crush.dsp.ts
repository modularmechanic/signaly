import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

class Crush extends Base {
  c = 0;
  h = 0;

  defaults(): Params {
    return { bits: 8, rate: 4, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      bcv = ch(I, 1),
      rcv = ch(I, 2),
      mcv = ch(I, 3);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const q = Math.pow(2, clamp((p.bits ?? 8) + (bcv?.[i] ?? 0) * 1.6, 1, 16) - 1);
      const rr = clamp((p.rate ?? 4) * Math.pow(2, ((rcv?.[i] ?? 0) / 5) * 2), 1, 64) | 0;
      const mix = clamp((p.mix ?? 1) + (mcv?.[i] ?? 0) / 5, 0, 1);
      if (++this.c >= rr) {
        this.c = 0;
        this.h = (Math.round(clamp(x / 5, -1, 1) * q) / q) * 5;
      }
      out[i] = x * (1 - mix) + this.h * mix;
    }
    return true;
  }
}
registerProcessor('crush', Crush);
