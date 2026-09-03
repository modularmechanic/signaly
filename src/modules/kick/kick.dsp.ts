import { Base, TP, ch, clamp, flush, Lcg, type Params } from '../../engine/dsp-prelude';

/** How far above TUNE the pitch envelope starts, at full sweep. */
const SWEEP = 4;

/** Analog-style bass drum: pitch envelope into a sine, a click transient, then drive.
    Every envelope starts at 0, so the module is silent until the first trigger. */
class Kick extends Base {
  phase = 0;
  amp = 0;
  pitchEnv = 0;
  clickEnv = 0;
  accent = 1;
  lastTrig = 0;
  ledHold = 0;
  led = 0;
  rng = new Lcg(0x9d2c07);

  defaults(): Params {
    return { tune: 50, pdec: 0.04, adec: 0.35, click: 0.3, drive: 0.2, level: 0.8 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const trig = ch(I, 0);
    const acc = ch(I, 1);
    const tcv = ch(I, 2);
    const p = this.p;
    const tune = clamp(p.tune ?? 50, 20, 200);
    const click = clamp(p.click ?? 0.3, 0, 1);
    const drive = clamp(p.drive ?? 0.2, 0, 1);
    const level = clamp(p.level ?? 0.8, 0, 1);
    // exp(-1/(t*sr)) per sample: the envelope is down 8.7 dB after t seconds.
    const ampDk = Math.exp(-1 / (clamp(p.adec ?? 0.35, 0.03, 2) * sampleRate));
    const pitchDk = Math.exp(-1 / (clamp(p.pdec ?? 0.04, 0.005, 0.3) * sampleRate));
    const clickDk = Math.exp(-1 / (0.0015 * sampleRate));
    const gain = 1 + drive * 12;
    const ledLen = (sampleRate * 0.03) | 0;
    for (let i = 0; i < out.length; i++) {
      const g = trig?.[i] ?? 0;
      if (g > 2.5 && this.lastTrig <= 2.5) {
        this.amp = 1;
        this.pitchEnv = 1;
        this.clickEnv = 1;
        this.phase = 0;
        this.accent = clamp(1 + ((acc?.[i] ?? 0) / 5) * 0.8, 0.2, 2);
        this.ledHold = ledLen;
      }
      this.lastTrig = g;
      const f = clamp(tune * Math.pow(2, tcv?.[i] ?? 0) * (1 + this.pitchEnv * SWEEP), 5, sampleRate * 0.45);
      this.phase += f / sampleRate;
      if (this.phase >= 1) this.phase -= 1;
      const body = Math.sin(TP * this.phase) * this.amp;
      const transient = this.rng.next() * this.clickEnv * click * 1.6;
      const x = (body + transient) * this.accent;
      out[i] = clamp(Math.tanh(x * gain) * level * 5, -5, 5);
      this.amp = flush(this.amp * ampDk);
      this.pitchEnv = flush(this.pitchEnv * pitchDk);
      this.clickEnv = flush(this.clickEnv * clickDk);
      if (this.ledHold > 0) this.ledHold--;
    }
    const lit = this.ledHold > 0 ? 1 : 0;
    if (lit !== this.led) {
      this.led = lit;
      this.port.postMessage({ t: 'led', id: 'trig', v: lit });
    }
    return true;
  }
}

registerProcessor('kick', Kick);
