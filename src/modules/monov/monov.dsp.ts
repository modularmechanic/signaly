import { Base, blep, ch, clamp, lpCoeff, type Params } from '../../engine/dsp-prelude';

class MonoV extends Base {
  ph = 0;
  v = 0;
  e = 0;
  st = 3; // 0 attack, 1 decay/sustain, 3 release
  g = false;
  vel = 1;
  s1 = 0;
  s2 = 0;
  s3 = 0;
  s4 = 0;

  defaults(): Params {
    return { wave: 0, glide: 0.02, cut: 1400, res: 0.3, env: 0.6, fcv: 0, a: 0.005, d: 0.25, s: 0.5, r: 0.3 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      gt = ch(I, 1),
      fcin = ch(I, 2),
      ac = ch(I, 3);
    const out = O[0]?.[0],
      env = O[1]?.[0];
    if (!out || !env) return true;
    const p = this.p;
    const sus = p.s ?? 0.5,
      wave = p.wave ?? 0,
      cut = p.cut ?? 1400,
      envAmt = p.env ?? 0.6;
    const k = 4.1 * (p.res ?? 0.3);
    const ca = 1 - Math.exp(-1 / (Math.max(0.001, p.a ?? 0.005) * sampleRate));
    const cd = 1 - Math.exp(-1 / (Math.max(0.002, p.d ?? 0.25) * sampleRate));
    const cr = 1 - Math.exp(-1 / (Math.max(0.002, p.r ?? 0.3) * sampleRate));
    const gl = 1 - Math.exp(-1 / (Math.max(0.0005, p.glide ?? 0.02) * sampleRate));
    for (let i = 0; i < out.length; i++) {
      const g = (gt?.[i] ?? 0) > 2.5;
      if (g && !this.g) {
        this.st = 0;
        this.vel = ac ? clamp(0.4 + ((ac[i] ?? 0) / 5) * 0.6, 0.15, 1.3) : 1; // accent sampled at note-on
      }
      if (!g && this.g) this.st = 3;
      this.g = g;
      if (this.st === 0) {
        this.e += (1.08 - this.e) * ca;
        if (this.e >= 1) {
          this.e = 1;
          this.st = 1;
        }
      } else if (this.st === 1) this.e += (sus - this.e) * cd;
      else this.e += (0 - this.e) * cr;
      this.v += ((vo?.[i] ?? 0) - this.v) * gl;
      const f = clamp(130.81 * Math.pow(2, this.v + 1), 0.5, sampleRate * 0.45);
      const dt = f / sampleRate;
      this.ph += dt;
      if (this.ph >= 1) this.ph -= 1;
      const t = this.ph;
      const osc =
        wave === 0 ? 2 * t - 1 - blep(t, dt) : (t < 0.5 ? 1 : -1) + blep(t, dt) - blep((t + 0.5) % 1, dt);
      const fc = clamp(
        cut * Math.pow(2, this.e * envAmt * 4 * this.vel + (fcin?.[i] ?? 0)),
        25,
        sampleRate * 0.35,
      );
      const gg = lpCoeff(fc);
      const u = Math.tanh(osc - k * this.s4);
      this.s1 += gg * (u - this.s1);
      this.s2 += gg * (this.s1 - this.s2);
      this.s3 += gg * (this.s2 - this.s3);
      this.s4 += gg * (this.s3 - this.s4);
      out[i] = this.s4 * this.e * this.vel * 6;
      env[i] = this.e * this.vel * 5;
    }
    return true;
  }
}
registerProcessor('monov', MonoV);
