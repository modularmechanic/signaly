import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

// TPT state-variable filter (Zavalishin): one topology, three simultaneous outs.
class SVF extends Base {
  ic1 = 0;
  ic2 = 0;

  defaults(): Params {
    return { cut: 800, res: 0.25, cv: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      rcv = ch(I, 2);
    const lp = O[0]?.[0],
      bp = O[1]?.[0],
      hp = O[2]?.[0];
    if (!lp || !bp || !hp) return true;
    const { cut = 800, res = 0.25 } = this.p;
    for (let i = 0; i < lp.length; i++) {
      const x = inp?.[i] ?? 0;
      const fc = clamp(cut * Math.pow(2, cv?.[i] ?? 0), 15, sampleRate * 0.45);
      const g = Math.tan((Math.PI * fc) / sampleRate);
      const k = 2 - 1.96 * clamp(res + (rcv?.[i] ?? 0) / 5, 0, 1);
      const a1 = 1 / (1 + g * (g + k)),
        a2 = g * a1,
        a3 = g * a2;
      const v3 = x - this.ic2;
      const v1 = a1 * this.ic1 + a2 * v3;
      const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
      this.ic1 = 2 * v1 - this.ic1;
      this.ic2 = 2 * v2 - this.ic2;
      lp[i] = v2;
      bp[i] = v1;
      hp[i] = x - k * v1 - v2;
    }
    return true;
  }
}

registerProcessor('svf', SVF);
