import { Base, TP, ch, clamp, flush, type Params } from '../../engine/dsp-prelude';

const METAL_RATIOS = [1, 1.342, 1.671, 1.907, 2.371, 2.689] as const;

class Drum2 extends Base {
  private lastGate = 0;
  private elapsed = 1e9;
  private phase = 0;
  private phase2 = 0;
  private pitchEnvelope = 0;
  private readonly metalPhases = new Float64Array(6);
  private noiseState = 0x52f15e3;
  private filterLow = 0;
  private filterBand = 0;
  private readonly sampleMemory = new Float32Array(Math.ceil(sampleRate * 2.1));
  private sampleWrite = 0;
  private sampleCaptured = 0;
  private samplePosition = 0;
  private sampleRemaining = 0;

  defaults(): Params {
    return { tone: 0.55, snap: 0.4, click: 0.35, length: 0.35, pitch: 0, resonance: 0.5, adsr: 0.4, mode: 0 };
  }

  private noise(): number {
    let value = this.noiseState | 0;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.noiseState = value | 0;
    return (this.noiseState >>> 0) / 0x7fffffff - 1;
  }

  /** Attack / hold / exponential release, all derived from LENGTH and ADSR shape. */
  private envelope(length: number, shape: number): number {
    const attack = 0.0002 + shape * shape * Math.min(0.025, length * 0.2);
    const hold = shape * shape * shape * length * 0.12;
    if (this.elapsed < attack) return this.elapsed / attack;
    if (this.elapsed < attack + hold) return 1 - ((this.elapsed - attack) / Math.max(0.0001, hold)) * 0.2;
    const release = Math.max(0.002, length - attack - hold);
    const progress = (this.elapsed - attack - hold) / release;
    return progress >= 1 ? 0 : Math.exp(-6 * progress * (1.15 - shape * 0.45));
  }

  private readSample(rate: number): number {
    if (this.sampleRemaining <= 0 || this.sampleCaptured < 2) return 0;
    const n = this.sampleMemory.length;
    while (this.samplePosition < 0) this.samplePosition += n;
    const index = this.samplePosition | 0;
    const fraction = this.samplePosition - index;
    const value =
      (this.sampleMemory[index] ?? 0) * (1 - fraction) + (this.sampleMemory[(index + 1) % n] ?? 0) * fraction;
    this.samplePosition += rate;
    while (this.samplePosition >= n) this.samplePosition -= n;
    this.sampleRemaining -= rate;
    return value;
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const output = outputs[0]?.[0];
    const envelopeOutput = outputs[1]?.[0];
    if (!output || !envelopeOutput) return true;
    const gate = ch(inputs, 0);
    const pitchCv = ch(inputs, 1);
    const sampleInput = ch(inputs, 2);
    const p = this.p;
    const mode = Math.max(0, Math.min(4, (p.mode ?? 0) | 0));
    const length = clamp(p.length ?? 0.35, 0.02, 2);
    const tone = clamp(p.tone ?? 0.55, 0, 1);
    const snap = clamp(p.snap ?? 0.4, 0, 1);
    const click = clamp(p.click ?? 0.35, 0, 1);
    const resonance = clamp(p.resonance ?? 0.5, 0, 1);
    const adsr = clamp(p.adsr ?? 0.4, 0, 1);
    const memory = this.sampleMemory;
    for (let index = 0; index < output.length; index++) {
      if (sampleInput) {
        memory[this.sampleWrite] = sampleInput[index] ?? 0;
        this.sampleWrite = (this.sampleWrite + 1) % memory.length;
        this.sampleCaptured = Math.min(memory.length, this.sampleCaptured + 1);
      }
      const gateValue = gate?.[index] ?? 0;
      const triggered = gateValue > 2.5 && this.lastGate <= 2.5;
      this.lastGate = gateValue;
      if (triggered) {
        this.elapsed = 0;
        this.phase = 0;
        this.phase2 = 0;
        this.pitchEnvelope = 1;
        const captured = Math.min(this.sampleCaptured, Math.floor(length * sampleRate));
        this.samplePosition = this.sampleWrite - captured;
        this.sampleRemaining = captured;
      }

      const env = this.envelope(length, adsr);
      const pitch = Math.pow(2, (p.pitch ?? 0) + (pitchCv?.[index] ?? 0));
      const onset = Math.exp(-this.elapsed / Math.max(0.00015, 0.0003 + click * 0.0018));
      this.pitchEnvelope *= Math.exp(-1 / (sampleRate * (0.009 + snap * 0.06)));
      let raw: number;

      if (mode === 0) {
        const frequency = 48 * pitch * (1 + this.pitchEnvelope * (2 + snap * 8));
        this.phase = (this.phase + frequency / sampleRate) % 1;
        raw = Math.sin(TP * this.phase) * (0.85 + resonance * 0.28) + this.noise() * onset * click;
      } else if (mode === 1) {
        const frequency = 175 * pitch;
        this.phase = (this.phase + frequency / sampleRate) % 1;
        this.phase2 = (this.phase2 + (frequency * (1.47 + resonance * 0.45)) / sampleRate) % 1;
        raw =
          Math.sin(TP * this.phase) * 0.38 +
          Math.sin(TP * this.phase2) * 0.22 +
          this.noise() * (0.25 + snap * 0.95) +
          onset * click;
      } else if (mode === 2 || mode === 3) {
        const base = (mode === 2 ? 430 : 270) * pitch * (0.65 + tone * 1.2);
        let metal = 0;
        for (let voice = 0; voice < 6; voice++) {
          const next =
            ((this.metalPhases[voice] ?? 0) + (base * (METAL_RATIOS[voice] ?? 1)) / sampleRate) % 1;
          this.metalPhases[voice] = next;
          metal += next < 0.5 ? 1 : -1;
        }
        raw = metal / 6 + this.noise() * (0.2 + snap * (mode === 2 ? 0.45 : 0.8)) + onset * click;
      } else {
        raw = this.readSample(pitch) + onset * click * 0.35;
      }

      const cutoff = clamp(450 + tone * tone * 18_000, 80, sampleRate * 0.42);
      const coefficient = Math.min(0.95, 2 * Math.sin((Math.PI * cutoff) / sampleRate));
      const damping = 1.85 - resonance * 1.55;
      this.filterLow = flush(this.filterLow + coefficient * this.filterBand);
      const high = raw - this.filterLow - damping * this.filterBand;
      this.filterBand = flush(this.filterBand + coefficient * high);
      const filtered =
        mode === 2 || mode === 3 ? high * (0.35 + tone * 0.65) + this.filterBand * 0.3 : this.filterLow;
      output[index] = clamp(filtered * env * 5, -5, 5);
      envelopeOutput[index] = clamp(env * 5, 0, 5);
      this.elapsed += 1 / sampleRate;
    }
    return true;
  }
}

registerProcessor('drum2', Drum2);
