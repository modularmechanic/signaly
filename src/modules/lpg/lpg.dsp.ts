import { Base, ch, clamp, flush, lpCoeff, onePoleCoeff, type Params } from '../../engine/dsp-prelude';

// One vactrol state drives amplitude and brightness together — that coupling is the
// whole point of a low pass gate, and MODE lets you break it apart.
class Lpg extends Base {
  v = 0;
  f1 = 0;
  f2 = 0;
  lg = 0;

  defaults(): Params {
    return { level: 0, resp: 0.15, colour: 0.6, mode: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      cv = ch(I, 1),
      pg = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { level = 0, resp = 0.15, colour = 0.6, mode = 0 } = this.p;
    const tau = clamp(resp, 0.001, 4) * 1000;
    const aDn = onePoleCoeff(tau); // release: the slow half of the vactrol
    const aUp = onePoleCoeff(tau * 0.15); // it lights far faster than it dims
    const span = 3 + clamp(colour, 0, 1) * 8;
    for (let i = 0; i < out.length; i++) {
      const p = pg?.[i] ?? 0;
      if (p > 2.5 && this.lg <= 2.5) this.v = 1; // a ping strikes the cell fully on
      this.lg = p;
      const tgt = clamp(level + (cv?.[i] ?? 0) / 5, 0, 1);
      this.v = flush(this.v + (tgt - this.v) * (this.v < tgt ? aUp : aDn));
      const x = inp?.[i] ?? 0;
      const g = lpCoeff(clamp(30 * Math.pow(2, this.v * span), 20, sampleRate * 0.45));
      this.f1 = flush(this.f1 + g * (x - this.f1));
      this.f2 = flush(this.f2 + g * (this.f1 - this.f2));
      const gain = this.v * this.v * Math.sqrt(this.v); // vactrol taper, ~v^2.5
      out[i] = clamp(mode < 0.5 ? this.f2 * gain : mode < 1.5 ? x * gain : this.f2, -5, 5);
    }
    return true;
  }
}

registerProcessor('lpg', Lpg);
