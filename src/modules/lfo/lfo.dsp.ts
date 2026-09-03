import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

class LFO extends Base {
  ph = 0;
  sh = 0;
  lr = 0;
  lc = 0;
  led = 0;

  defaults(): Params {
    return { rate: 2 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const rc = ch(I, 0),
      rs = ch(I, 1),
      cs = ch(I, 2);
    const so = O[0]?.[0],
      to = O[1]?.[0],
      sa = O[2]?.[0],
      sq = O[3]?.[0],
      sh = O[4]?.[0];
    if (!so || !to || !sa || !sq || !sh) return true;
    const { rate = 2 } = this.p;
    for (let i = 0; i < so.length; i++) {
      const rr = rs?.[i] ?? 0;
      const clock = cs?.[i] ?? 0;
      // CLOCK is hard sync: a rising pulse restarts phase but leaves the
      // free-running rate law alone. RESET is the independent manual input.
      if ((rr > 2.5 && this.lr <= 2.5) || (clock > 2.5 && this.lc <= 2.5)) this.ph = 0;
      this.lr = rr;
      this.lc = clock;
      const f = clamp(rate * Math.pow(2, rc?.[i] ?? 0), 0.005, 200);
      this.ph += f / sampleRate;
      if (this.ph >= 1) {
        this.ph -= 1;
        this.sh = Math.random() * 10 - 5;
      }
      const t = this.ph;
      so[i] = Math.sin(TP * t) * 5;
      to[i] = (t < 0.5 ? 4 * t - 1 : 3 - 4 * t) * 5;
      sa[i] = (2 * t - 1) * 5;
      sq[i] = t < 0.5 ? 5 : -5;
      sh[i] = this.sh;
    }
    // Rate LED: 50% duty at the LFO rate, posted only on a change.
    const lit = this.ph < 0.5 ? 1 : 0;
    if (lit !== this.led) {
      this.led = lit;
      this.port.postMessage({ t: 'led', id: 'clk', v: lit });
    }
    return true;
  }
}

registerProcessor('lfo', LFO);
