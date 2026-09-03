import { readLinear, Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

const MAX_SLICES = 16;

/** Divide the loaded sample into SLICES equal parts and loop whichever one is selected:
    directly by a patched SLICE CV (-5..+5 V across all slices), or — with nothing patched —
    stepped one slice forward on each STEP trigger. */
class Slicer extends Base {
  buf: Float32Array | null = null;
  step = 0;
  phase = 0;
  lastIdx = -1;
  lastTrig = 0;

  defaults(): Params {
    return { slices: 8 };
  }

  override msg(m: InMsg): void {
    const v = m.v as unknown;
    if (m.t === 'sample' && v instanceof Float32Array) {
      this.buf = v;
      this.step = 0;
      this.lastIdx = -1;
    }
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const sel = ch(I, 0);
    const trig = ch(I, 1);
    const p = this.p;
    const buf = this.buf;
    const len = buf?.length ?? 0;
    const n = clamp(Math.round(p.slices ?? 8), 1, MAX_SLICES);
    const sliceLen = len / n;
    for (let i = 0; i < out.length; i++) {
      const t = trig?.[i] ?? 0;
      const cv = sel?.[i];
      let idx: number;
      if (cv !== undefined) {
        idx = clamp(Math.floor(((cv / 5 + 1) / 2) * n), 0, n - 1);
      } else {
        if (t > 2.5 && this.lastTrig <= 2.5) this.step = (this.step + 1) % n;
        idx = this.step;
      }
      this.lastTrig = t;
      if (idx !== this.lastIdx) {
        this.phase = idx * sliceLen;
        this.lastIdx = idx;
      }
      if (!buf || sliceLen < 2) {
        out[i] = 0;
        continue;
      }
      out[i] = clamp(readLinear(buf, this.phase) * 5, -5, 5);
      this.phase++;
      const sliceEnd = (idx + 1) * sliceLen;
      if (this.phase >= sliceEnd) this.phase = idx * sliceLen;
    }
    return true;
  }
}

registerProcessor('slicer', Slicer);
