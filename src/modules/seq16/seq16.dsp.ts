import { Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

const N = 16;

/** SEQ-16 — 16-step pattern of pitch (semitones) + gate + per-step slide (portamento).
    In: `{t:'step', i, pitch, gate, slide}` (single edit) or `{t:'steps', v[], g[], sl[]}` (patch load).
    Out: `{t:'step', i}` whenever the playhead moves. */
class Seq16 extends Base {
  vals = [0, 3, 7, 10, 12, 7, 3, -2, 0, 3, 7, 10, 12, 7, 3, -2];
  gates = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1];
  slides = new Array(N).fill(0) as number[];
  step = 0;
  lc = 0;
  lr = 0;
  cv = 0;
  sent = -1;

  defaults(): Params {
    return { len: N, glide: 0.01 };
  }

  override msg(m: InMsg): void {
    if (m.t === 'step') {
      const i = Math.round(Number(m.i));
      if (!Number.isFinite(i) || i < 0 || i >= N) return;
      if (typeof m.pitch === 'number' && Number.isFinite(m.pitch)) this.vals[i] = m.pitch;
      if (typeof m.gate === 'number') this.gates[i] = m.gate ? 1 : 0;
      if (typeof m.slide === 'number') this.slides[i] = m.slide ? 1 : 0;
    } else if (m.t === 'steps' && Array.isArray(m.v) && Array.isArray(m.g)) {
      const v = m.v as unknown[];
      const g = m.g as unknown[];
      const sl = (Array.isArray(m.sl) ? m.sl : []) as unknown[];
      for (let i = 0; i < N; i++) {
        const pitch = v[i];
        const gate = g[i];
        const slide = sl[i];
        if (typeof pitch === 'number' && Number.isFinite(pitch)) this.vals[i] = pitch;
        if (typeof gate === 'number') this.gates[i] = gate ? 1 : 0;
        if (typeof slide === 'number') this.slides[i] = slide ? 1 : 0;
      }
    }
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const cv = O[0]?.[0];
    const gt = O[1]?.[0];
    if (!cv || !gt) return true;
    const clk = ch(I, 0);
    const rst = ch(I, 1);
    const p = this.p;
    const gc = 1 - Math.exp(-1 / (Math.max(0.001, p.glide ?? 0.01) * sampleRate));
    const len = clamp(Math.round(p.len ?? N), 1, N);
    for (let i = 0; i < cv.length; i++) {
      const c = clk?.[i] ?? 0;
      const r = rst?.[i] ?? 0;
      if (r > 2.5 && this.lr <= 2.5) this.step = 0;
      this.lr = r;
      if (c > 2.5 && this.lc <= 2.5) {
        this.step = (this.step + 1) % len;
        // A non-slide step snaps immediately; a slide step glides in below via `gc`.
        if (!this.slides[this.step]) this.cv = (this.vals[this.step] ?? 0) / 12;
      }
      this.lc = c;
      this.cv += ((this.vals[this.step] ?? 0) / 12 - this.cv) * gc;
      cv[i] = this.cv;
      gt[i] = this.gates[this.step] && c > 2.5 ? 5 : 0;
    }
    if (this.step !== this.sent) {
      this.sent = this.step;
      this.port.postMessage({ t: 'step', i: this.step });
    }
    return true;
  }
}

registerProcessor('seq16', Seq16);
