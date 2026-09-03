import { Base, ch, type Params } from '../../engine/dsp-prelude';

// stages: 0 attack · 1 decay/sustain · 3 release
class ADSR extends Base {
  e = 0;
  st = 3;
  g = false;

  defaults(): Params {
    return { a: 0.01, d: 0.25, s: 0.6, r: 0.4 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const gt = ch(I, 0);
    const out = O[0]?.[0],
      inv = O[1]?.[0];
    if (!out || !inv) return true;
    const { a = 0.01, d = 0.25, s = 0.6, r = 0.4 } = this.p;
    const ca = 1 - Math.exp(-1 / (Math.max(0.001, a) * sampleRate));
    const cd = 1 - Math.exp(-1 / (Math.max(0.002, d) * sampleRate));
    const cr = 1 - Math.exp(-1 / (Math.max(0.002, r) * sampleRate));
    for (let i = 0; i < out.length; i++) {
      const g = (gt?.[i] ?? 0) > 2.5;
      if (g && !this.g) this.st = 0;
      if (!g && this.g) this.st = 3;
      this.g = g;
      if (this.st === 0) {
        // overshoot target 1.08 so the exponential attack actually reaches 1
        this.e += (1.08 - this.e) * ca;
        if (this.e >= 1) {
          this.e = 1;
          this.st = 1;
        }
      } else if (this.st === 1) this.e += (s - this.e) * cd;
      else if (this.st === 3) this.e += (0 - this.e) * cr;
      out[i] = this.e * 5;
      inv[i] = -this.e * 5;
    }
    return true;
  }
}

registerProcessor('adsr', ADSR);
