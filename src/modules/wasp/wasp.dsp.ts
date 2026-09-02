import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

class Wasp extends Base {
  ic1 = 0;
  ic2 = 0;
  rng = new Lcg(12345);

  defaults(): Params {
    return { cut: 900, res: 0.4, dirt: 0.4, cv: 0 };
  }

  /** CMOS crossover kink — asymmetric bite that grows with signal level. */
  kink(v: number, dirt: number): number {
    return clamp(v + dirt * 0.08 * Math.tanh(v * 9) * Math.abs(v), -2, 2);
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      fcv = ch(I, 1);
    const lpO = O[0]?.[0],
      bpO = O[1]?.[0],
      hpO = O[2]?.[0];
    if (!lpO || !bpO || !hpO) return true;
    const { cut = 900, res = 0.4, dirt = 0.4 } = this.p;
    const k = 2 - 1.96 * clamp(res, 0, 1);
    const drive = 1 + dirt * 3;
    const dnorm = Math.tanh(drive);
    for (let i = 0; i < lpO.length; i++) {
      const bleed = this.rng.next() * 0.006 * dirt;
      const f = clamp(cut * Math.pow(2, fcv?.[i] ?? 0), 20, sampleRate * 0.4);
      const g = Math.tan((Math.PI * f) / sampleRate);
      const x = Math.tanh(((inp?.[i] ?? 0) / 5 + bleed) * drive) / dnorm;
      const a1 = 1 / (1 + g * (g + k));
      const hp = (x - (g + k) * this.ic1 - this.ic2) * a1;
      let bp = g * hp + this.ic1;
      bp = bp + dirt * 0.18 * (Math.tanh(bp * 2.5) - bp); // feedback nonlinearity
      const lp = g * bp + this.ic2;
      this.ic1 = clamp(g * hp + bp, -20, 20);
      this.ic2 = clamp(g * bp + lp, -20, 20);
      lpO[i] = this.kink(lp, dirt) * 5;
      bpO[i] = this.kink(bp, dirt) * 5;
      hpO[i] = this.kink(hp, dirt) * 5;
    }
    return true;
  }
}

registerProcessor('wasp', Wasp);
