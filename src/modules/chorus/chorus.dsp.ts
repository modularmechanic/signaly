import { Base, ch, clamp, DL, TP, type Params } from '../../engine/dsp-prelude';

class Chorus extends Base {
  d = new DL(sampleRate * 0.1);
  ph = 0;

  defaults(): Params {
    return { rate: 0.5, depth: 0.5, mix: 0.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      rcv = ch(I, 1),
      dcv = ch(I, 2),
      mcv = ch(I, 3);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p;
    for (let i = 0; i < L.length; i++) {
      const x = inp?.[i] ?? 0;
      const rate = clamp((p.rate ?? 0.5) * Math.pow(2, ((rcv?.[i] ?? 0) / 5) * 2), 0.01, 12);
      this.ph += rate / sampleRate;
      if (this.ph > 1) this.ph -= 1;
      const depth = clamp((p.depth ?? 0.5) + (dcv?.[i] ?? 0) / 5, 0, 1);
      const mix = clamp((p.mix ?? 0.5) + (mcv?.[i] ?? 0) / 5, 0, 1);
      const base = 0.014 * sampleRate,
        dep = 0.007 * sampleRate * depth;
      const a = this.d.read(base + Math.sin(TP * this.ph) * dep);
      const b = this.d.read(base * 1.3 + Math.sin(TP * (this.ph + 0.25)) * dep);
      this.d.push(x);
      L[i] = x * (1 - mix) + a * mix;
      R[i] = x * (1 - mix) + b * mix;
    }
    return true;
  }
}
registerProcessor('chorus', Chorus);
