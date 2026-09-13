import { Base, ch, clamp, DL, TP } from '../../engine/dsp-prelude';

// Must equal the FEEDBK knob's bound in flanger.def.ts — worklet scope cannot import the def.
const FB_MAX = 0.95;
// The comb recirculates to 1/(1-g) of its input, which reached 35 V at full feedback. Scale the wet
// path by (1-g) so the peak lands at the +/-5 V convention instead. Chosen over saturating the loop:
// this adds no harmonics and leaves the notch depths — the actual flanger sound — untouched, so
// resonance now trades level for sharpness the way a real one does rather than getting louder.

class Flanger extends Base {
  d = new DL(sampleRate * 0.03);
  ph = 0;

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      rcv = ch(I, 1),
      fcv = ch(I, 2),
      dcv = ch(I, 3),
      mcv = ch(I, 4);
    const out = O[0]?.[0];
    if (!out) return true;
    const p = this.p;
    for (let i = 0; i < out.length; i++) {
      const x = inp?.[i] ?? 0;
      const rate = clamp((p.rate ?? 0.25) * Math.pow(2, ((rcv?.[i] ?? 0) / 5) * 2), 0.005, 10);
      this.ph += rate / sampleRate;
      if (this.ph > 1) this.ph -= 1;
      const depth = clamp((p.depth ?? 0.7) + (dcv?.[i] ?? 0) / 5, 0, 1);
      const d = (0.001 + 0.006 * depth * (0.5 + 0.5 * Math.sin(TP * this.ph))) * sampleRate;
      const y = this.d.read(d);
      // CV cannot push feedback past what the knob itself reaches: same bound as FEEDBK in the def.
      const fb = clamp((p.fb ?? 0.5) + (fcv?.[i] ?? 0) / 5, -FB_MAX, FB_MAX);
      const mix = clamp((p.mix ?? 0.5) + (mcv?.[i] ?? 0) / 5, 0, 1);
      const g = fb * 0.95;
      this.d.push(x + y * g); // DL.push() flushes denormals in the loop
      out[i] = x * (1 - mix) + y * mix * (1 - Math.abs(g));
    }
    return true;
  }
}
registerProcessor('flanger', Flanger);
