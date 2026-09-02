import { Base, ch, type Params } from '../../engine/dsp-prelude';

// One slope generator: envelope when free, slew limiter when SIGNAL is patched.
class Func extends Base {
  e = 0;
  dir = 0;
  lt = 0;
  eoc = 0;

  defaults(): Params {
    return { rise: 0.05, fall: 0.4, cycle: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const tr = ch(I, 0),
      sig = ch(I, 1);
    const out = O[0]?.[0],
      eo = O[1]?.[0];
    if (!out || !eo) return true;
    const { rise = 0.05, fall = 0.4, cycle = 0 } = this.p;
    const ru = 5 / (Math.max(0.001, rise) * sampleRate);
    const fu = 5 / (Math.max(0.001, fall) * sampleRate);
    for (let i = 0; i < out.length; i++) {
      const t = tr?.[i] ?? 0;
      if (t > 2.5 && this.lt <= 2.5) this.dir = 1;
      this.lt = t;
      if (sig) {
        const tgt = sig[i] ?? 0;
        this.e = this.e < tgt ? Math.min(tgt, this.e + ru) : Math.max(tgt, this.e - fu);
      } else if (this.dir === 1) {
        this.e += ru;
        if (this.e >= 5) {
          this.e = 5;
          this.dir = -1;
        }
      } else if (this.dir === -1) {
        this.e -= fu;
        if (this.e <= 0) {
          this.e = 0;
          this.eoc = sampleRate * 0.005;
          this.dir = cycle ? 1 : 0;
        }
      }
      out[i] = this.e;
      eo[i] = this.eoc > 0 ? 5 : 0;
      if (this.eoc > 0) this.eoc--;
    }
    return true;
  }
}

registerProcessor('func', Func);
