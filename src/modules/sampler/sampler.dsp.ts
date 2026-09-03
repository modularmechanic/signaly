import { Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

function readLinear(buf: Float32Array, pos: number): number {
  const n = buf.length;
  const p = pos < 0 ? 0 : pos > n - 1 ? n - 1 : pos;
  const i0 = Math.floor(p);
  const frac = p - i0;
  const s0 = buf[i0] ?? 0;
  const s1 = buf[i0 + 1] ?? s0;
  return s0 + (s1 - s0) * frac;
}

/** Play a loaded sample on a trigger, 1 V/oct + PITCH, between START and END, forward or
    REVERSE, one-shot or LOOP. `msg({t:'sample', v})` hands over the decoded mono buffer — see
    src/ui/molecules/sample-picker.tsx for the transfer contract. */
class Sampler extends Base {
  buf: Float32Array | null = null;
  pos = 0;
  playing = false;
  lastTrig = 0;

  defaults(): Params {
    return { pitch: 0, start: 0, end: 1, loop: 0, reverse: 0 };
  }

  override msg(m: InMsg): void {
    const v = m.v as unknown;
    if (m.t === 'sample' && v instanceof Float32Array) {
      this.buf = v;
      this.playing = false;
    }
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const trig = ch(I, 0);
    const voct = ch(I, 1);
    const p = this.p;
    const buf = this.buf;
    const len = buf?.length ?? 0;
    const reverse = (p.reverse ?? 0) >= 0.5;
    const loop = (p.loop ?? 0) >= 0.5;
    const a = Math.min(p.start ?? 0, p.end ?? 1) * len;
    const b = Math.max(p.start ?? 0, p.end ?? 1) * len;
    for (let i = 0; i < out.length; i++) {
      const t = trig?.[i] ?? 0;
      if (t > 2.5 && this.lastTrig <= 2.5) {
        this.pos = reverse ? b : a;
        this.playing = len > 1 && b - a > 1;
      }
      this.lastTrig = t;
      if (!this.playing || !buf) {
        out[i] = 0;
        continue;
      }
      out[i] = clamp(readLinear(buf, this.pos) * 5, -5, 5);
      const semis = (p.pitch ?? 0) + (voct?.[i] ?? 0) * 12;
      const rate = Math.pow(2, semis / 12);
      this.pos += reverse ? -rate : rate;
      // ponytail: wrap resets to the window edge rather than carrying the overshoot remainder,
      // so a fast LOOP can click on the seam. Carry `pos - edge` forward if that matters.
      if (reverse ? this.pos <= a : this.pos >= b) {
        if (loop) this.pos = reverse ? b : a;
        else this.playing = false;
      }
    }
    return true;
  }
}

registerProcessor('sampler', Sampler);
