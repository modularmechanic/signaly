import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

/** One trigger in, COUNT triggers out. CURVE bends the gaps geometrically:
    +1 halves each gap (accelerating roll), -1 doubles it, 0 is metronomic. */
class Burst extends Base {
  lastTrig = 0;
  pending = 0;
  running = false;
  gap = 0;
  ratio = 1;
  timer = 0;
  hold = 0;
  eocHold = 0;

  defaults(): Params {
    return { count: 4, space: 0.06, curve: 0, ccvamt: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    const eoc = O[1]?.[0];
    if (!out || !eoc) return true;
    const trig = ch(I, 0);
    const ccv = ch(I, 1);
    const p = this.p;
    const pulseLen = Math.max(1, (sampleRate * 0.001) | 0);
    const baseGap = Math.max(pulseLen + 1, clamp(p.space ?? 0.06, 0.005, 0.5) * sampleRate);
    const ratio = Math.pow(0.5, clamp(p.curve ?? 0, -1, 1));
    for (let i = 0; i < out.length; i++) {
      const g = trig?.[i] ?? 0;
      if (g > 2.5 && this.lastTrig <= 2.5) {
        this.pending = clamp(Math.round((p.count ?? 4) + ((ccv?.[i] ?? 0) / 5) * 15), 1, 16);
        this.gap = baseGap;
        this.ratio = ratio;
        this.timer = 0;
        this.running = true;
      }
      this.lastTrig = g;
      if (this.running) {
        if (this.timer > 0) this.timer--;
        else if (this.pending > 0) {
          this.hold = pulseLen;
          this.pending--;
          // The countdown starts on the sample AFTER the pulse, so one fewer.
          this.timer = Math.max(pulseLen + 1, Math.round(this.gap)) - 1;
          this.gap *= this.ratio;
        } else {
          this.eocHold = pulseLen;
          this.running = false;
        }
      }
      out[i] = this.hold > 0 ? 5 : 0;
      eoc[i] = this.eocHold > 0 ? 5 : 0;
      if (this.hold > 0) this.hold--;
      if (this.eocHold > 0) this.eocHold--;
    }
    return true;
  }
}

registerProcessor('burst', Burst);
