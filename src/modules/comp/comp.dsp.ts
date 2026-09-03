// Stereo linked feed-forward compressor. Peak detector max(|L|,|R|) -> attack/
// release one-pole ballistics -> soft-knee gain computer (Giannoulis et al.,
// "Digital Dynamic Range Compressor Design") -> gain reduction in dB. Linear
// gain x makeup hits both channels; LIMIT brickwalls to ±5V. Posts
// {t:'meter', in, gr} (dB, ref 5V) every 8 blocks for the panel meter.
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

const REF = 5; // 0 dBFS == 5V (the ±5V audio convention)
const EPS = 1e-6; // level floor so log10 never sees 0

const dbFromV = (v: number): number => 20 * Math.log10(Math.max(v, EPS) / REF);

class Comp extends Base {
  env = 0; // smoothed peak detector, in volts
  inDb = -120;
  grDb = 0;
  n = 0; // block counter, throttles the meter post to every 8th block

  defaults(): Params {
    return { thr: -18, ratio: 4, atk: 0.01, rel: 0.12, knee: 6, makeup: 0, limit: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const l = ch(I, 0),
      r = ch(I, 1);
    const outL = O[0]?.[0],
      outR = O[1]?.[0];
    if (!outL || !outR) return true;
    const p = this.p;

    const atkC = 1 - Math.exp(-1 / (sampleRate * Math.max(0.0001, p.atk ?? 0.01)));
    const relC = 1 - Math.exp(-1 / (sampleRate * Math.max(0.001, p.rel ?? 0.12)));
    const ratio = Math.max(1, p.ratio ?? 4);
    const knee = Math.max(0, p.knee ?? 6);
    const thr = p.thr ?? -18;
    const makeupLin = Math.pow(10, (p.makeup ?? 0) / 20);
    const limitOn = (p.limit ?? 0) > 0.5;

    for (let i = 0; i < outL.length; i++) {
      const lv = l?.[i] ?? 0,
        rv = r?.[i] ?? 0;
      const peak = Math.max(Math.abs(lv), Math.abs(rv));

      // ballistics: attack when rising, release when falling
      this.env += (peak - this.env) * (peak > this.env ? atkC : relC);

      const x = dbFromV(this.env);
      let yG: number; // gain-computer output level, dB
      if (knee <= EPS) yG = x <= thr ? x : thr + (x - thr) / ratio;
      else if (2 * (x - thr) < -knee) yG = x;
      else if (2 * Math.abs(x - thr) <= knee)
        yG = x + ((1 / ratio - 1) * Math.pow(x - thr + knee / 2, 2)) / (2 * knee);
      else yG = thr + (x - thr) / ratio;

      const gr = x - yG; // gain reduction, dB (>= 0)
      const gain = Math.pow(10, -gr / 20) * makeupLin;

      let ov = lv * gain,
        ow = rv * gain;
      if (limitOn) {
        ov = clamp(ov, -REF, REF);
        ow = clamp(ow, -REF, REF);
      }
      outL[i] = ov;
      outR[i] = ow;
      this.inDb = x;
      this.grDb = gr;
    }

    if (++this.n >= 8) {
      this.n = 0;
      this.port.postMessage({ t: 'meter', in: this.inDb, gr: this.grDb });
    }
    return true;
  }
}
registerProcessor('comp', Comp);
