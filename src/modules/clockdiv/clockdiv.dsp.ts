import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

class ClockDiv extends Base {
  cnt = 0;
  lc = 0;
  lr = 0;
  hi = 0;
  pw = Math.max(1, (sampleRate * 0.005) | 0);
  /** LED hold: the 5 ms output gate is too short to see. */
  lpw = Math.max(1, (sampleRate * 0.05) | 0);
  ledHold = 0;
  led = 0;

  defaults(): Params {
    return { div: 4 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const N = clamp(Math.round(this.p.div ?? 4), 1, 64);
    for (let i = 0; i < out.length; i++) {
      const c = clk?.[i] ?? 0;
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.cnt = 0;
      this.lr = r;
      if (c > 2.5 && this.lc <= 2.5) {
        if (this.cnt === 0) {
          this.hi = this.pw; // fire on the 1st of every N pulses
          this.ledHold = this.lpw;
        }
        this.cnt = (this.cnt + 1) % N;
      }
      this.lc = c;
      out[i] = this.hi > 0 ? 5 : 0;
      if (this.hi > 0) this.hi--;
      if (this.ledHold > 0) this.ledHold--;
    }
    const lit = this.ledHold > 0 ? 1 : 0;
    if (lit !== this.led) {
      this.led = lit;
      this.port.postMessage({ t: 'led', id: 'clk', v: lit });
    }
    return true;
  }
}

registerProcessor('clockdiv', ClockDiv);
