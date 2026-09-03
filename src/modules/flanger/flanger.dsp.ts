import { Base, ch, clamp, DL, TP, type Params } from '../../engine/dsp-prelude';

class Flanger extends Base {
  d = new DL(sampleRate * 0.03);
  ph = 0;

  defaults(): Params {
    return { rate: 0.25, depth: 0.7, fb: 0.5, mix: 0.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      rcv = ch(I, 1),
      fcv = ch(I, 2),
      dcv = ch(I, 3),
      mcv = ch(I, 4);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const rate = clamp((p.rate ?? 0.25) * Math.pow(2, ((rcv?.[i] ?? 0) / 5) * 2), 0.005, 10);
      this.ph += rate / sampleRate;
      if (this.ph > 1) this.ph -= 1;
      const depth = clamp((p.depth ?? 0.7) + (dcv?.[i] ?? 0) / 5, 0, 1);
      const d = (0.001 + 0.006 * depth * (0.5 + 0.5 * Math.sin(TP * this.ph))) * sampleRate;
      const y = this.d.read(d);
      const fb = clamp((p.fb ?? 0.5) + (fcv?.[i] ?? 0) / 5, -0.97, 0.97);
      const mix = clamp((p.mix ?? 0.5) + (mcv?.[i] ?? 0) / 5, 0, 1);
      this.d.push(x + y * fb * 0.95); // DL.push() flushes denormals in the loop
      out[i] = x * (1 - mix) + y * mix;
    }
    return true;
  }
}
registerProcessor('flanger', Flanger);
