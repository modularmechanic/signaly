import { Base, ch, clamp, ClockSync, flush, TP, type Params } from '../../engine/dsp-prelude';

const STAGES = [4, 6, 8];

/** A chain of first-order TPT all-pass sections swept by an LFO. Nothing is delayed,
    so unlike FLANGER the notches are not harmonically spaced: N sections put a null
    wherever the chain hits 180 degrees, at f = centre * tan(90 deg * k / N). */
class Phaser extends Base {
  s = new Float64Array(8);
  ph = 0;
  last = 0;
  cs = new ClockSync();
  gate = 0;

  defaults(): Params {
    return { rate: 0.4, depth: 0.6, centre: 800, fb: 0.4, mix: 0.5, stages: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      ccv = ch(I, 1),
      sync = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const n = STAGES[clamp(Math.round(p.stages ?? 1), 0, 2)] ?? 6;
    const depth = clamp(p.depth ?? 0.6, 0, 1);
    const fb = clamp(p.fb ?? 0.4, -0.9, 0.9);
    const mix = clamp(p.mix ?? 0.5, 0, 1);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const g = sync?.[i] ?? 0;
      const per = this.cs.tick(g);
      // A patched clock owns the sweep: one LFO cycle per pulse, restarted on each edge.
      if (g > 2.5 && this.gate <= 2.5) this.ph = 0;
      this.gate = g;
      const rate = per > 0 ? sampleRate / per : clamp(p.rate ?? 0.4, 0.01, 20);
      this.ph += rate / sampleRate;
      if (this.ph >= 1) this.ph -= 1;
      const centre = clamp((p.centre ?? 800) * Math.pow(2, (ccv?.[i] ?? 0) / 5), 40, 12000);
      const fc = clamp(centre * Math.pow(2, depth * 2 * Math.sin(TP * this.ph)), 15, sampleRate * 0.45);
      const gg = Math.tan((Math.PI * fc) / sampleRate);
      const a = gg / (1 + gg);
      let v = x + clamp(this.last * fb, -6, 6);
      for (let k = 0; k < n; k++) {
        const st = this.s[k] ?? 0;
        const u = (v - st) * a;
        const lp = u + st;
        this.s[k] = flush(lp + u);
        v = 2 * lp - v; // all-pass = LP - HP
      }
      this.last = flush(v);
      out[i] = clamp(x * (1 - mix) + v * mix, -5, 5);
    }
    return true;
  }
}
registerProcessor('phaser', Phaser);
