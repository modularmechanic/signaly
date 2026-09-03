import { Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

const STEPS_PER_BAR = 96; // 24 ppq * 4 beats
const CAP = STEPS_PER_BAR * 16;

/** CV REC — records a CV on every incoming clock step while REC is engaged and always plays
    the buffer back, held between steps. Recording overwrites in place, so the next lap
    through the loop plays the new value: a live overdub, not a fixed take. */
class CvRec extends Base {
  buf = new Float32Array(CAP);
  pos = 0;
  lc = 0;
  lr = 0;

  defaults(): Params {
    return { bars: 4, rec: 0 };
  }

  override msg(m: InMsg): void {
    if (m.t === 'load' && Array.isArray(m.buf)) {
      const src = m.buf as unknown[];
      for (let i = 0; i < CAP; i++) {
        const v = src[i];
        this.buf[i] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      }
      this.pos = 0;
    }
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const inp = ch(I, 0);
    const clk = ch(I, 1);
    const rst = ch(I, 2);
    const p = this.p;
    const steps = clamp(Math.round(p.bars ?? 4), 1, 16) * STEPS_PER_BAR;
    const recOn = (p.rec ?? 0) >= 0.5;
    for (let i = 0; i < out.length; i++) {
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.pos = 0;
      this.lr = r;
      const c = clk?.[i] ?? 0;
      if (c > 2.5 && this.lc <= 2.5) {
        if (recOn) {
          const v = clamp(inp?.[i] ?? 0, -5, 5);
          this.buf[this.pos] = v;
          // One scalar per written step keeps m.ext.cvrec (owned by cvrec.serialize.ts) current
          // for save/load without cloning the whole buffer off the audio thread.
          this.port.postMessage({ t: 'rec', i: this.pos, v });
        }
        this.pos = (this.pos + 1) % steps;
      }
      this.lc = c;
      out[i] = this.buf[this.pos] ?? 0;
    }
    return true;
  }
}

registerProcessor('cvrec', CvRec);
