import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

/** Discrete RATIO steps each operator can snap to. */
const RATIOS = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 10, 12];
/** Phase-modulation depth in radians per unit LEVEL — a full FM bite at LEVEL 1. */
const FM_DEPTH = 6;

/** Four-operator phase-modulation voice. LEVEL scales how hard an operator modulates the next
    one in its chain (or, in PARALLEL, its own output level). A single shared AD envelope —
    percussive: it decays to zero even while GATE is held, like a plucked FM bell. */
class FMVoice extends Base {
  ph1 = 0;
  ph2 = 0;
  ph3 = 0;
  ph4 = 0;
  fb = 0; // op4's previous sample, for the FB STACK algorithm's self-feedback
  env = 0;
  stage = 1; // 0 attack, 1 decay
  gateLast = 0;
  led = 0;

  defaults(): Params {
    return {
      tune: 220,
      r1: 1,
      r2: 1,
      r3: 1,
      r4: 1,
      l1: 1,
      l2: 0,
      l3: 0,
      l4: 0,
      atk: 0.005,
      dec: 0.6,
      algo: 0,
    };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const voct = ch(I, 0),
      gate = ch(I, 1),
      tcv = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    const tune = clamp(p.tune ?? 220, 20, 4000);
    const ratio = (idx: number): number => RATIOS[clamp(Math.round(idx), 0, RATIOS.length - 1)] ?? 1;
    const r1 = ratio(p.r1 ?? 1);
    const r2 = ratio(p.r2 ?? 1);
    const r3 = ratio(p.r3 ?? 1);
    const r4 = ratio(p.r4 ?? 1);
    const l1 = clamp(p.l1 ?? 1, 0, 1);
    const l2 = clamp(p.l2 ?? 0, 0, 1);
    const l3 = clamp(p.l3 ?? 0, 0, 1);
    const l4 = clamp(p.l4 ?? 0, 0, 1);
    const algo = clamp(Math.round(p.algo ?? 0), 0, 3);
    const ca = 1 - Math.exp(-1 / (Math.max(0.001, p.atk ?? 0.005) * sampleRate));
    const cd = 1 - Math.exp(-1 / (Math.max(0.005, p.dec ?? 0.6) * sampleRate));
    let lit = 0;
    for (let i = 0; i < out.length; i++) {
      const g = gate?.[i] ?? 0;
      if (g > 2.5 && this.gateLast <= 2.5) this.stage = 0;
      this.gateLast = g;
      if (g > 2.5) lit = 1;
      if (this.stage === 0) {
        this.env += (1 - this.env) * ca;
        if (this.env >= 0.999) {
          this.env = 1;
          this.stage = 1;
        }
      } else {
        this.env += (0 - this.env) * cd;
      }
      const oct = (voct?.[i] ?? 0) + (tcv?.[i] ?? 0);
      const base = tune * Math.pow(2, oct);
      const f1 = clamp(base * r1, 0.5, sampleRate * 0.45);
      const f2 = clamp(base * r2, 0.5, sampleRate * 0.45);
      const f3 = clamp(base * r3, 0.5, sampleRate * 0.45);
      const f4 = clamp(base * r4, 0.5, sampleRate * 0.45);
      this.ph1 = (this.ph1 + f1 / sampleRate) % 1;
      this.ph2 = (this.ph2 + f2 / sampleRate) % 1;
      this.ph3 = (this.ph3 + f3 / sampleRate) % 1;
      this.ph4 = (this.ph4 + f4 / sampleRate) % 1;
      const s2 = Math.sin(TP * this.ph2);
      const s4 = Math.sin(TP * this.ph4);
      let voice: number;
      if (algo === 2) {
        // PARALLEL: four independent carriers, additive
        voice = (Math.sin(TP * this.ph1) * l1 + s2 * l2 + Math.sin(TP * this.ph3) * l3 + s4 * l4) * 0.5;
      } else if (algo === 1) {
        // 2-CARRIER: op2 -> op1, op4 -> op3, both carriers summed
        const o1 = Math.sin(TP * this.ph1 + l2 * FM_DEPTH * s2) * l1;
        const o3 = Math.sin(TP * this.ph3 + l4 * FM_DEPTH * s4) * l3;
        voice = (o1 + o3) * 0.5;
      } else if (algo === 3) {
        // FB STACK: op4 self-modulates (one-sample-delayed feedback), then op3 -> op2 -> op1
        const o4 = Math.sin(TP * this.ph4 + l4 * FM_DEPTH * this.fb);
        this.fb = o4;
        const o3 = Math.sin(TP * this.ph3 + l4 * FM_DEPTH * o4);
        const o2 = Math.sin(TP * this.ph2 + l3 * FM_DEPTH * o3);
        voice = Math.sin(TP * this.ph1 + l2 * FM_DEPTH * o2) * l1;
      } else {
        // STACK (default): serial chain op4 -> op3 -> op2 -> op1 (carrier)
        const o3 = Math.sin(TP * this.ph3 + l4 * FM_DEPTH * s4);
        const o2 = Math.sin(TP * this.ph2 + l3 * FM_DEPTH * o3);
        voice = Math.sin(TP * this.ph1 + l2 * FM_DEPTH * o2) * l1;
      }
      out[i] = clamp(voice * this.env * 5, -5, 5);
    }
    if (lit !== this.led) {
      this.led = lit;
      this.port.postMessage({ t: 'led', id: 'gate', v: lit });
    }
    return true;
  }
}

registerProcessor('fmvoice', FMVoice);
