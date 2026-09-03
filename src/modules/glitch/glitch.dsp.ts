import { Base, ch, clamp, ClockSync, DL, Lcg, SYNC_DIV, type Params } from '../../engine/dsp-prelude';

/** Discrete playback-rate steps for the repeat, mirroring fRate's /8 /4 /2 x1 x2 x4 x8. */
const RATE_MULT = [0.125, 0.25, 0.5, 1, 2, 4, 8];

/** Clocked buffer repeat: capture the last LENGTH ms of input and stutter it REPEATS times.
    Unlike FREEZE/PITCH, a hard-cut loop is the point here — the abrupt seam IS the glitch. */
class Glitch extends Base {
  buf = new DL(Math.ceil(sampleRate * 0.6));
  cs = new ClockSync();
  rng = new Lcg(0xc0ffee);
  clkLast = 0;
  trigLast = 0;
  active = 0;
  ph = 0;
  loopLen = 0;
  cyclesLeft = 0;
  led = 0;

  defaults(): Params {
    return { length: 80, repeats: 4, prob: 0.5, pitch: 3, mix: 1, sync: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      clk = ch(I, 1),
      trg = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const sync = p.sync ?? 0;
    const mix = clamp(p.mix ?? 1, 0, 1);
    const prob = clamp(p.prob ?? 0.5, 0, 1);
    const repeats = clamp(Math.round(p.repeats ?? 4), 1, 32);
    const rate = RATE_MULT[clamp(Math.round(p.pitch ?? 3), 0, RATE_MULT.length - 1)] ?? 1;
    const freeLen = clamp(Math.round(((p.length ?? 80) / 1000) * sampleRate), 16, this.buf.n - 4);
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const c = clk?.[i] ?? 0;
      const t = trg?.[i] ?? 0;
      // one full clock pulse worth of samples, expressed via the shared division table
      const per = this.cs.tick(c) * (SYNC_DIV[4] ?? 1);
      const clockEdge = c > 2.5 && this.clkLast <= 2.5;
      const trigEdge = t > 2.5 && this.trigLast <= 2.5;
      this.clkLast = c;
      this.trigLast = t;
      if ((clockEdge || trigEdge) && !this.active) {
        const roll = (this.rng.next() + 1) / 2;
        if (roll <= prob) {
          this.loopLen = sync === 1 && per > 0 ? clamp(Math.round(per), 16, this.buf.n - 4) : freeLen;
          this.ph = 0;
          this.cyclesLeft = repeats;
          this.active = 1;
        }
      }
      let wet: number;
      if (this.active) {
        wet = this.buf.read(this.loopLen * (1 - this.ph));
        this.ph += rate / this.loopLen;
        if (this.ph >= 1) {
          this.ph -= 1;
          this.cyclesLeft--;
          if (this.cyclesLeft <= 0) this.active = 0;
        }
      } else {
        this.buf.push(x);
        wet = x;
      }
      out[i] = clamp(x * (1 - mix) + wet * mix, -5, 5);
    }
    if (this.active !== this.led) {
      this.led = this.active;
      this.port.postMessage({ t: 'led', id: 'repeating', v: this.led });
    }
    return true;
  }
}

registerProcessor('glitch', Glitch);
