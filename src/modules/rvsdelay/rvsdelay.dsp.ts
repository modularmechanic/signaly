import { Base, ch, clamp, ClockSync, type Params } from '../../engine/dsp-prelude';

const MAX_S = 1; // seconds, chunk-length ceiling

/** Ping-pong pair of chunk buffers: one records while the other plays back in reverse. At the
    chunk boundary the tail of the outgoing (old) reversed chunk and the head of the incoming
    (freshly recorded) one overlap for a short equal-power crossfade -- both are available at
    that instant, because the incoming chunk's last samples are exactly the ones just written,
    so the seam never clicks. A patched CLOCK sets the chunk length to one pulse period. */
class Rvsdelay extends Base {
  bufs = [new Float32Array(Math.ceil(sampleRate * MAX_S)), new Float32Array(Math.ceil(sampleRate * MAX_S))];
  rec = 0;
  wr = 0;
  chunk = Math.ceil(sampleRate * 0.3);
  xf = Math.round(sampleRate * 0.024);
  rp = this.chunk - 1;
  cs = new ClockSync();

  defaults(): Params {
    return { time: 0.3, mix: 0.7 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      clk = ch(I, 1);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const mix = clamp(p.mix ?? 0.7, 0, 1);
    const maxLen = this.bufs[0]!.length;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const per = this.cs.tick(clk?.[i] ?? 0);
      const recBuf = this.bufs[this.rec]!;
      const playBuf = this.bufs[1 - this.rec]!;
      if (this.wr < this.chunk) recBuf[this.wr] = x;
      this.wr++;
      let wet = playBuf[this.rp] ?? 0;
      if (this.rp < this.xf) {
        const nw = recBuf[this.chunk - 1 - this.rp] ?? 0;
        const c = (this.xf - 1 - this.rp) / Math.max(1, this.xf - 1);
        wet = wet * Math.cos((c * Math.PI) / 2) + nw * Math.sin((c * Math.PI) / 2);
      }
      out[i] = clamp(x * (1 - mix) + wet * mix, -5, 5);
      this.rp--;
      if (this.rp < 0) {
        this.rec = 1 - this.rec;
        this.wr = 0;
        const chunkSec = per > 0 ? per / sampleRate : (p.time ?? 0.3);
        this.chunk = clamp(Math.round(chunkSec * sampleRate), 480, maxLen - 8);
        this.xf = clamp(Math.round(this.chunk * 0.08), 8, Math.floor(this.chunk / 2) - 1);
        this.rp = this.chunk - 1;
      }
    }
    return true;
  }
}

registerProcessor('rvsdelay', Rvsdelay);
