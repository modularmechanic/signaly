import { Base, ch, clamp, flush, lpCoeff, OnePole, type Params } from '../../engine/dsp-prelude';

const BASE_HZ = 317;
/** Harmonic stack at METAL 0; the 808's inharmonic square bank at METAL 1. */
const HARMONIC = [1, 2, 3, 4, 5, 6];
const METALLIC = [1, 1.4471, 1.617, 1.9265, 2.5028, 2.6637];

/** Six detuned squares through a two-pole high pass, with one shared decay envelope.
    CLOSED and OPEN differ only in the decay they install — which is exactly the choke:
    a closed trigger overwrites a ringing open tail with the short decay. */
class Hats extends Base {
  private readonly phases = new Float64Array(6);
  private readonly steps = new Float64Array(6);
  env = 0;
  decay = 0;
  accent = 1;
  lastClosed = 0;
  lastOpen = 0;
  hp1 = new OnePole(1);
  hp2 = new OnePole(1);

  defaults(): Params {
    return { tone: 5000, cdec: 0.04, odec: 0.5, metal: 0.8, level: 0.7 };
  }

  /** exp(-1/(t*sr)): the per-sample decay factor for a time constant in seconds. */
  private static coeff(t: number): number {
    return Math.exp(-1 / (t * sampleRate));
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const closed = ch(I, 0);
    const open = ch(I, 1);
    const acc = ch(I, 2);
    const p = this.p;
    const metal = clamp(p.metal ?? 0.8, 0, 1);
    const level = clamp(p.level ?? 0.7, 0, 1);
    const closedDk = Hats.coeff(clamp(p.cdec ?? 0.04, 0.005, 0.3));
    const openDk = Hats.coeff(clamp(p.odec ?? 0.5, 0.05, 2));
    const tone = clamp(p.tone ?? 5000, 800, 12000);
    const g = lpCoeff(tone);
    // The 12 dB/oct high pass costs ~25x between 800 Hz and 12 kHz; without this
    // makeup, TONE doubles as a volume knob. Fitted to hold the peak near 4 V.
    const makeup = 8.8 * Math.pow(tone / 3000, 1.7);
    this.hp1.a = g;
    this.hp2.a = g;
    const steps = this.steps;
    for (let v = 0; v < 6; v++) {
      const r = (HARMONIC[v] ?? 1) * (1 - metal) + (METALLIC[v] ?? 1) * metal;
      steps[v] = clamp((BASE_HZ * r) / sampleRate, 0, 0.49);
    }
    for (let i = 0; i < out.length; i++) {
      const c = closed?.[i] ?? 0;
      const o = open?.[i] ?? 0;
      if (o > 2.5 && this.lastOpen <= 2.5) {
        this.env = 1;
        this.decay = openDk;
        this.accent = clamp(1 + ((acc?.[i] ?? 0) / 5) * 0.8, 0.2, 2);
      }
      // Checked second so a simultaneous CLOSED wins, as on the hardware bus.
      if (c > 2.5 && this.lastClosed <= 2.5) {
        this.env = 1;
        this.decay = closedDk;
        this.accent = clamp(1 + ((acc?.[i] ?? 0) / 5) * 0.8, 0.2, 2);
      }
      this.lastClosed = c;
      this.lastOpen = o;
      let bank = 0;
      for (let v = 0; v < 6; v++) {
        const ph = ((this.phases[v] ?? 0) + (steps[v] ?? 0)) % 1;
        this.phases[v] = ph;
        bank += ph < 0.5 ? 1 : -1;
      }
      // x - lowpass(x), twice: a 12 dB/oct high pass built from the prelude one-pole.
      const b = bank / 6;
      const s1 = b - this.hp1.process(b);
      const s2 = s1 - this.hp2.process(s1);
      out[i] = clamp(s2 * this.env * this.accent * level * makeup, -5, 5);
      this.env = flush(this.env * this.decay);
    }
    return true;
  }
}

registerProcessor('hats', Hats);
