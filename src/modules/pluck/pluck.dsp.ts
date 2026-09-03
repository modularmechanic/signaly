import { Base, ch, clamp, DL, Lcg, OnePole, lpCoeff, type Params } from '../../engine/dsp-prelude';

/** e^-6.9078 = 0.001: -60 dB, so `DECAY` is a real T60 independent of the DAMP filter's own tilt. */
const T60 = 6.907755;

/** Karplus-Strong: a noise burst excites a tuned delay loop; a damping filter and a per-sample
    decay gain shape how the string dies. Pitch is sampled once per trigger, like a real pluck. */
class Pluck extends Base {
  buf = new DL(Math.ceil(sampleRate / 20));
  damp = new OnePole(0, 0);
  exc = new OnePole(0, 0);
  rng = new Lcg(0x50a11ce);
  burstLeft = 0;
  lastTrig = 0;
  loopLen = 200;
  r = 0.999;

  defaults(): Params {
    return { tune: 220, damp: 3500, bright: 0.6, dec: 1.2, tcvA: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const voct = ch(I, 0),
      trig = ch(I, 1),
      tcv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const tune = clamp(p.tune ?? 220, 20, 4000);
    const brightHz = 300 * Math.pow(40, clamp(p.bright ?? 0.6, 0, 1));
    this.exc.a = lpCoeff(brightHz);
    this.damp.a = lpCoeff(clamp(p.damp ?? 3500, 80, sampleRate * 0.45));
    const decSec = clamp(p.dec ?? 1.2, 0.02, 10);
    for (let i = 0; i < out.length; i++) {
      const t = trig?.[i] ?? 0;
      if (t > 2.5 && this.lastTrig <= 2.5) {
        const oct = (voct?.[i] ?? 0) + (tcv?.[i] ?? 0);
        const f = clamp(tune * Math.pow(2, oct), 20, sampleRate * 0.45);
        this.loopLen = clamp(Math.round(sampleRate / f), 4, this.buf.n - 4);
        this.burstLeft = this.loopLen;
        // A packet of energy only gets touched once per full loop traversal (loopLen
        // samples), not every sample, so the per-traversal gain needs the loop length
        // folded in for DECAY to land on a real T60 of wall-clock time.
        this.r = Math.exp((-T60 * this.loopLen) / (decSec * sampleRate));
      }
      this.lastTrig = t;
      let fed = this.damp.process(this.buf.read(this.loopLen)) * this.r;
      if (this.burstLeft > 0) {
        fed += this.exc.process(this.rng.next() * 5);
        this.burstLeft--;
      }
      this.buf.push(fed);
      out[i] = clamp(fed, -5, 5);
    }
    return true;
  }
}

registerProcessor('pluck', Pluck);
