import { Base, ch, clamp, Lcg, type Params } from '../../engine/dsp-prelude';

/** RANDOM WALK — a Brownian CV: on every clock it drifts by a random amount up to STEP,
    clamped to ±RANGE so it wanders forever without ever leaving its bounds. */
class RndWalk extends Base {
  v = 0;
  lc = 0;
  lr = 0;
  rng = new Lcg(42017);

  defaults(): Params {
    return { step: 0.5, range: 5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const p = this.p;
    const range = clamp(p.range ?? 5, 0.1, 5);
    const step = clamp(p.step ?? 0.5, 0.01, 2);
    for (let i = 0; i < out.length; i++) {
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.v = 0;
      this.lr = r;
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lc <= 2.5) this.v = clamp(this.v + this.rng.next() * step, -range, range);
      this.lc = c;
      out[i] = this.v;
    }
    return true;
  }
}

registerProcessor('rndwalk', RndWalk);
