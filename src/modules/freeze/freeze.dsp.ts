import { Base, ch, clamp, DL, OnePole, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** Capture a moment of audio and loop it. MODE GATE freezes while held; TOGGLE latches on a
    trigger. While frozen the capture buffer stops being written, which is what makes the loop
    both stable and independent of further input — there is nothing left for new input to touch. */
class Freeze extends Base {
  buf = new DL(Math.ceil(sampleRate * 2.2));
  ph = 0;
  frozen = 0;
  gateLast = 0;
  loopLen = 4800;
  sm = new OnePole(0, 0);
  led = 0;

  defaults(): Params {
    return { size: 250, pitch: 0, smooth: 0.3, mix: 0.6, mode: 0 };
  }

  /** Two taps a half-loop apart, constant-power blended (sin^2 + cos^2 = 1): each tap's own
      wrap-click lands exactly where its envelope is zero, so the loop seam never clicks.
      Side effect of that symmetry: tap(ph) === tap(ph + 0.5), so a full 0..1 sweep of `ph`
      plays the captured window twice. The caller advances `ph` at half rate to compensate,
      so the audible loop period comes out to exactly `len` samples. */
  tap(ph: number, len: number): number {
    const ph2 = ph < 0.5 ? ph + 0.5 : ph - 0.5;
    const s1 = this.buf.read(len * (1 - ph));
    const s2 = this.buf.read(len * (1 - ph2));
    const eA = Math.sin(Math.PI * ph) ** 2;
    return s1 * eA + s2 * (1 - eA);
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      frz = ch(I, 1),
      pcv = ch(I, 2);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p;
    const mode = p.mode ?? 0;
    const mix = clamp(p.mix ?? 0.6, 0, 1);
    const sizeMs = clamp(p.size ?? 250, 10, 2500);
    // SMOOTH softens the frozen texture on top of the click-free seam above: 0 bypasses the
    // filter entirely (so the loop is exactly periodic), rising toward a hard 800 Hz roll-off.
    const smooth = clamp(p.smooth ?? 0.3, 0, 1);
    this.sm.a = lpCoeff(clamp(16000 - smooth * 15200, 800, 16000));
    for (let i = 0; i < L.length; i++) {
      const x = inp?.[i] ?? 0;
      const g = frz?.[i] ?? 0;
      const wasFrozen = this.frozen;
      if (mode === 1) {
        if (g > 2.5 && this.gateLast <= 2.5) this.frozen = this.frozen ? 0 : 1;
      } else {
        this.frozen = g > 2.5 ? 1 : 0;
      }
      this.gateLast = g;
      if (this.frozen && !wasFrozen) {
        this.loopLen = clamp(Math.round((sizeMs / 1000) * sampleRate), 8, this.buf.n - 4);
        this.ph = 0;
      }
      let wet: number;
      if (this.frozen) {
        const semis = clamp((p.pitch ?? 0) + ((pcv?.[i] ?? 0) / 5) * 24, -24, 24);
        const rate = Math.pow(2, semis / 12);
        this.ph += rate / (2 * this.loopLen); // half rate: see the note on tap()'s symmetry
        this.ph -= Math.floor(this.ph);
        const raw = this.tap(this.ph, this.loopLen);
        wet = smooth > 0 ? this.sm.process(raw) : raw;
      } else {
        this.buf.push(x);
        wet = x;
      }
      const y = clamp(x * (1 - mix) + wet * mix, -5, 5);
      L[i] = y;
      R[i] = y;
    }
    if (this.frozen !== this.led) {
      this.led = this.frozen;
      this.port.postMessage({ t: 'led', id: 'frozen', v: this.led });
    }
    return true;
  }
}

registerProcessor('freeze', Freeze);
