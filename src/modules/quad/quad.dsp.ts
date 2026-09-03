import { Base, ch, clamp, oscW, type Params } from '../../engine/dsp-prelude';

class Quad extends Base {
  ph = new Float64Array([Math.random(), Math.random(), Math.random(), Math.random()]);
  // symmetric detune fan around the played pitch, in units of SPREAD cents
  off = new Float64Array([-1.5, -0.5, 0.5, 1.5]);

  defaults(): Params {
    return { oct: 0, det: 8, wave: 2 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      dc = ch(I, 1);
    const o1 = O[0]?.[0],
      o2 = O[1]?.[0],
      o3 = O[2]?.[0],
      o4 = O[3]?.[0],
      mx = O[4]?.[0];
    if (!o1 || !o2 || !o3 || !o4 || !mx) return true;
    const { oct = 0, det = 8, wave = 2 } = this.p;
    const n = mx.length;
    mx.fill(0);
    // one voice per outer pass so no per-block output array is allocated
    for (let k = 0; k < 4; k++) {
      const ob = k === 0 ? o1 : k === 1 ? o2 : k === 2 ? o3 : o4;
      const off = this.off[k] ?? 0;
      let ph = this.ph[k] ?? 0;
      for (let i = 0; i < n; i++) {
        const v = oct + (vo?.[i] ?? 0);
        const spread = clamp(det + (dc?.[i] ?? 0) * 8, 0, 60);
        const f = clamp(261.626 * Math.pow(2, v + (off * spread) / 1200), 0.1, sampleRate * 0.45);
        const dt = f / sampleRate;
        ph += dt;
        if (ph >= 1) ph -= 1;
        const o = oscW(wave | 0, ph, dt) * 5;
        ob[i] = o;
        mx[i] = (mx[i] ?? 0) + o;
      }
      this.ph[k] = ph;
    }
    for (let i = 0; i < n; i++) mx[i] = (mx[i] ?? 0) * 0.35;
    return true;
  }
}

registerProcessor('quad', Quad);
