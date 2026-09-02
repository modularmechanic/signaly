import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

class NoiseLab extends Base {
  rng = new Lcg(55555);
  lp = 0;
  hpz = 0;
  f1 = 0;
  f2 = 0;
  burstE = 0;
  lg = 0;
  rndV = 0;
  rt = 0;
  b0 = 0;
  b1 = 0;
  b2 = 0;

  defaults(): Params {
    return { color: 0, cut: 8000, dec: 0.15, dens: 20 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const gt = ch(I, 0),
      cc = ch(I, 1),
      fcv = ch(I, 2);
    const out = O[0]?.[0],
      dust = O[1]?.[0],
      rndO = O[2]?.[0],
      burst = O[3]?.[0];
    if (!out || !dust || !rndO || !burst) return true;
    const { color = 0, cut = 8000, dec = 0.15, dens = 20 } = this.p;
    const sr = sampleRate;
    const decC = Math.exp(-1 / (Math.max(0.005, dec) * sr));
    for (let i = 0; i < out.length; i++) {
      const w = this.rng.next();
      // color: -1 brown … 0 white … +1 blue (via pink pivots)
      this.b0 = 0.99765 * this.b0 + w * 0.099046;
      this.b1 = 0.963 * this.b1 + w * 0.2965;
      this.b2 = 0.57 * this.b2 + w * 1.0526;
      const pink = (this.b0 + this.b1 + this.b2 + w * 0.1848) * 0.18;
      this.lp += (w - this.lp) * 0.012;
      const brown = this.lp * 6;
      const blue = w - this.hpz;
      this.hpz = w;
      const col = clamp(color + (cc?.[i] ?? 0) / 5, -1, 1);
      let x;
      if (col < -0.5) x = brown * (-col * 2 - 1) + pink * (2 + col * 2);
      else if (col < 0) x = pink * -col * 2 + w * (1 + col * 2);
      else if (col < 0.5) x = w * (1 - col * 2) + blue * col * 2 * 0.7;
      else x = blue * 0.7;
      // resonant LP
      const fc = clamp(cut * Math.pow(2, (fcv?.[i] ?? 0) * 0.5), 40, sr * 0.45);
      const g = Math.tan((Math.PI * fc) / sr),
        k = 1.2,
        a1 = 1 / (1 + g * (g + k));
      const hp = (x - (g + k) * this.f1 - this.f2) * a1;
      const bp = g * hp + this.f1;
      const lpv = g * bp + this.f2;
      this.f1 = g * hp + bp;
      this.f2 = g * bp + lpv;
      const y = clamp(lpv, -1.5, 1.5);
      out[i] = y * 5;
      // dust — random impulses at DENSITY hz
      dust[i] = Math.abs(this.rng.next()) < dens / sr ? this.rng.next() * 9 : 0;
      // stepped random voltage clocked at DENSITY hz
      this.rt += dens / sr;
      if (this.rt >= 1) {
        this.rt -= 1;
        this.rndV = this.rng.next() * 5;
      }
      rndO[i] = this.rndV;
      const g5 = gt?.[i] ?? 0;
      if (g5 > 2.5 && this.lg <= 2.5) this.burstE = 1;
      this.lg = g5;
      this.burstE *= decC;
      burst[i] = y * this.burstE * 5;
    }
    return true;
  }
}

registerProcessor('noiselab', NoiseLab);
