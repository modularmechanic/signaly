import { Base, ch, clamp, ClockSync, oscW, type Params } from '../../engine/dsp-prelude';

const SHAPES = [0, 1, 3]; // oscW indices: sine, triangle, square

/** One LFO drives two complementary gains (env, 1-env). At DEPTH 0 both channels pass the
    input straight through -- that IS the dry state, so DEPTH is this module's dry/wet control.
    Summed, the two outputs are a plain amplitude tremolo; split to a stereo pair they auto-pan
    the input between channels, which is why there are two outs instead of one. */
class Trem extends Base {
  ph = 0;
  cs = new ClockSync();
  gate = 0;

  defaults(): Params {
    return { rate: 4, depth: 0.7, shape: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      sync = ch(I, 1);
    const L = O[0]?.[0],
      R = O[1]?.[0];
    if (!L || !R) return true;
    const p = this.p;
    const wave = SHAPES[clamp(Math.round(p.shape ?? 0), 0, 2)] ?? 0;
    const depth = clamp(p.depth ?? 0.7, 0, 1);
    for (let i = 0; i < L.length; i++) {
      const x = inp?.[i] ?? 0;
      const g = sync?.[i] ?? 0;
      const per = this.cs.tick(g);
      if (g > 2.5 && this.gate <= 2.5) this.ph = 0;
      this.gate = g;
      const rate = per > 0 ? sampleRate / per : clamp(p.rate ?? 4, 0.02, 20);
      const dt = rate / sampleRate;
      this.ph += dt;
      if (this.ph >= 1) this.ph -= 1;
      const lfo = 0.5 + 0.5 * oscW(wave, this.ph, dt);
      L[i] = clamp(x * (1 - depth + depth * lfo), -5, 5);
      R[i] = clamp(x * (1 - depth + depth * (1 - lfo)), -5, 5);
    }
    return true;
  }
}

registerProcessor('trem', Trem);
