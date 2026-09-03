import { Base, ch, clamp, DL, Lcg, OnePole, lpCoeff, TP, type Params } from '../../engine/dsp-prelude';

/** Four independent lo-fi flaws, each on one knob: WOW wobbles pitch through a short modulated
    delay tap, BANDWIDTH rolls off the top end with a one-pole low-pass, HISS adds white noise,
    and CRACKLE fires sparse random impulses -- the things that make a copy sound like a copy. */
class Lofi extends Base {
  d = new DL(Math.ceil(sampleRate * 0.05));
  ph = 0;
  bwF = new OnePole(0, 0);
  rng = new Lcg(20260903);

  defaults(): Params {
    return { bw: 8000, wow: 0.3, hiss: 0.05, crackle: 0.1, mix: 1 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const bwHz = clamp(p.bw ?? 8000, 200, 19000);
    const wow = clamp(p.wow ?? 0.3, 0, 1);
    const hiss = clamp(p.hiss ?? 0.05, 0, 1);
    const crackle = clamp(p.crackle ?? 0.1, 0, 1);
    const mix = clamp(p.mix ?? 1, 0, 1);
    this.bwF.a = lpCoeff(bwHz);
    const base = 0.006 * sampleRate;
    const dep = 0.004 * sampleRate * wow;
    const rate = 0.7 + wow * 1.5;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      this.d.push(x);
      this.ph += rate / sampleRate;
      if (this.ph > 1) this.ph -= 1;
      const wobbled = wow > 0 ? this.d.read(base + Math.sin(TP * this.ph) * dep) : x;
      let wet = this.bwF.process(wobbled);
      wet += hiss * this.rng.next() * 0.4;
      if (crackle > 0 && Math.abs(this.rng.next()) > 1 - crackle * 0.02) {
        wet += this.rng.next() * 3 * crackle;
      }
      out[i] = clamp(x * (1 - mix) + wet * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('lofi', Lofi);
