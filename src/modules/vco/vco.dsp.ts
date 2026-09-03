import { Base, blep, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

class VCO extends Base {
  ph = 0;
  tri = 0;
  ls = 0;

  defaults(): Params {
    return { oct: 0, fine: 0, pw: 0.5, fm: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      fmc = ch(I, 1),
      pm = ch(I, 2),
      sy = ch(I, 3);
    const so = O[0]?.[0],
      to = O[1]?.[0],
      sa = O[2]?.[0],
      sq = O[3]?.[0];
    if (!so || !to || !sa || !sq) return true;
    const { oct = 0, fine = 0, pw = 0.5, fm = 0 } = this.p;
    for (let i = 0; i < so.length; i++) {
      const v = oct + fine / 12 + (vo?.[i] ?? 0) + (fmc?.[i] ?? 0) * fm * 0.2;
      const f = clamp(261.626 * Math.pow(2, v), 0.05, sampleRate * 0.45);
      const dt = f / sampleRate;
      const s = sy?.[i] ?? 0;
      if (s > 2.5 && this.ls <= 2.5) this.ph = 0;
      this.ls = s;
      this.ph += dt;
      if (this.ph >= 1) this.ph -= 1;
      const t = this.ph;
      const saw = 2 * t - 1 - blep(t, dt);
      const w = clamp(pw + (pm?.[i] ?? 0) / 10, 0.03, 0.97);
      const sqv = (t < w ? 1 : -1) + blep(t, dt) - blep((t - w + 1) % 1, dt);
      // triangle by leaky-integrating the square, so PW skews it like the real thing
      this.tri = this.tri * 0.999 + sqv * 4 * dt;
      so[i] = Math.sin(TP * t) * 5;
      to[i] = clamp(this.tri, -1.2, 1.2) * 5;
      sa[i] = saw * 5;
      sq[i] = sqv * 5;
    }
    return true;
  }
}

registerProcessor('vco', VCO);
