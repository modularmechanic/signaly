// Stereo noise gate. A fixed-time detector follows max(|L|,|R|) in dB; the gate
// opens when that crosses THRESHOLD (offset by THRESH CV) or while TRIGGER is
// high. A separate ATTACK/HOLD/RELEASE envelope ramps toward unity when open
// and toward the RANGE attenuation when closed. GATE OUT is 5V while open.
import { Base, ch, type Params } from '../../engine/dsp-prelude';

const DET_TAU = 0.003; // detector follower time constant (s)
const THRCV_DB_PER_V = 6; // threshold CV scale: volts -> dB offset
const ATK_FLOOR = 0.00005;
const REL_FLOOR = 0.001;
const MSG_EVERY = 8; // process() calls between {t:'meter'} posts

class Gate extends Base {
  det = 0; // detector envelope (linear amplitude)
  gain = 0; // gate gain envelope (0..1)
  holdCtr = 0; // samples left in the HOLD window
  msgCtr = 0;

  defaults(): Params {
    return { thr: -40, atk: 0.002, hold: 0.05, rel: 0.15, range: -60 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inl = ch(I, 0),
      inr = ch(I, 1),
      thrcv = ch(I, 2),
      trig = ch(I, 3);
    const outl = O[0]?.[0],
      outr = O[1]?.[0],
      gout = O[2]?.[0];
    if (!outl || !outr || !gout) return true;
    const p = this.p;
    const thrKnob = p.thr ?? -40;

    const detC = 1 - Math.exp(-1 / (DET_TAU * sampleRate));
    const atkC = 1 - Math.exp(-1 / (Math.max(ATK_FLOOR, p.atk ?? 0.002) * sampleRate));
    const relC = 1 - Math.exp(-1 / (Math.max(REL_FLOOR, p.rel ?? 0.15) * sampleRate));
    const holdSamples = Math.max(0, p.hold ?? 0.05) * sampleRate;
    const rangeGain = Math.pow(10, (p.range ?? -60) / 20);

    let inDb = -120,
      thrDb = thrKnob,
      trigOn = false;

    for (let i = 0; i < outl.length; i++) {
      const l = inl?.[i] ?? 0;
      const r = inr?.[i] ?? 0;
      const peak = Math.max(Math.abs(l), Math.abs(r));
      this.det += (peak - this.det) * detC;
      inDb = 20 * Math.log10(Math.max(1e-6, this.det / 5));

      thrDb = thrKnob + (thrcv?.[i] ?? 0) * THRCV_DB_PER_V;
      trigOn = (trig?.[i] ?? 0) > 2.5;

      const openNow = inDb > thrDb || trigOn;
      if (openNow) this.holdCtr = holdSamples;
      else if (this.holdCtr > 0) this.holdCtr--;

      const open = openNow || this.holdCtr > 0;
      const target = open ? 1 : rangeGain;
      this.gain += (target - this.gain) * (target > this.gain ? atkC : relC);

      outl[i] = l * this.gain;
      outr[i] = r * this.gain;
      gout[i] = open ? 5 : 0;
    }

    this.msgCtr = (this.msgCtr + 1) % MSG_EVERY;
    if (this.msgCtr === 0) {
      this.port.postMessage({ t: 'meter', in: inDb, thr: thrDb, open: this.gain, trig: trigOn ? 1 : 0 });
    }
    return true;
  }
}
registerProcessor('gate', Gate);
