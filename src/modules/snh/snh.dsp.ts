import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

class SnH extends Base {
  h1 = 0;
  h2 = 0;
  s1 = 0;
  s2 = 0;
  lt1 = 0;
  lt2 = 0;
  ph = 0;
  rng = new Lcg(135797);
  clkGate = 0;

  defaults(): Params {
    return { rate: 8, prob: 1, slew1: 0.001, slew2: 0.001 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const in1 = ch(I, 0),
      t1 = ch(I, 1),
      in2 = ch(I, 2),
      t2 = ch(I, 3),
      rcv = ch(I, 4),
      pcv = ch(I, 5);
    const o1 = O[0]?.[0],
      o2 = O[1]?.[0],
      clkO = O[2]?.[0],
      nzO = O[3]?.[0];
    if (!o1 || !o2 || !clkO || !nzO) return true;
    const { rate = 8, prob = 1, slew1 = 0.001, slew2 = 0.001 } = this.p;
    const c1 = 1 - Math.exp(-1 / (Math.max(0.0005, slew1) * sampleRate));
    const c2 = 1 - Math.exp(-1 / (Math.max(0.0005, slew2) * sampleRate));
    const pulse = (0.004 * sampleRate) | 0;
    for (let i = 0; i < o1.length; i++) {
      const w = this.rng.next() * 5;
      const r = clamp(rate * Math.pow(2, ((rcv?.[i] ?? 0) / 5) * 3), 0.05, 200);
      this.ph += r / sampleRate;
      if (this.ph >= 1) {
        this.ph -= 1;
        this.clkGate = pulse;
      }
      if (this.clkGate > 0) this.clkGate--;
      const pb = clamp(prob + (pcv?.[i] ?? 0) / 5, 0, 1);
      // each channel follows its own trigger when patched, else the internal clock
      const tv1 = t1?.[i] ?? (this.clkGate > 0 ? 5 : 0);
      const tv2 = t2?.[i] ?? (this.clkGate > 0 ? 5 : 0);
      if (tv1 > 2.5 && this.lt1 <= 2.5 && (pb >= 1 || this.rng.next() * 0.5 + 0.5 < pb))
        this.h1 = in1?.[i] ?? w;
      if (tv2 > 2.5 && this.lt2 <= 2.5 && (pb >= 1 || this.rng.next() * 0.5 + 0.5 < pb))
        this.h2 = in2?.[i] ?? w;
      this.lt1 = tv1;
      this.lt2 = tv2;
      this.s1 += (this.h1 - this.s1) * c1;
      this.s2 += (this.h2 - this.s2) * c2;
      o1[i] = this.s1;
      o2[i] = this.s2;
      clkO[i] = this.clkGate > 0 ? 5 : 0;
      nzO[i] = w;
    }
    return true;
  }
}

registerProcessor('snh', SnH);
