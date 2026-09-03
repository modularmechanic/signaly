import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

const LEN = 1024;
const TABLES = 8;
const HARM = 64;
/** Spectral tilt of tables 4..7: 1/n^e, so each is brighter than the last. */
const TILT = [0.7, 0.5, 0.3, 0.15];

/** Amplitude of harmonic `n` (1-based) in table `t`. */
function amp(t: number, n: number): number {
  const odd = n % 2 === 1;
  if (t === 0) return n === 1 ? 1 : 0;
  if (t === 1) return odd ? (((n - 1) / 2) % 2 ? -1 : 1) / (n * n) : 0;
  if (t === 2) return 1 / n;
  if (t === 3) return odd ? 1 / n : 0;
  return 1 / Math.pow(n, TILT[t - 4] ?? 1);
}

/** Eight peak-normalised single-cycle waves, computed once per worklet load.
    One table per octave would kill the aliasing above ~2 kHz; a single set is the
    honest wavetable trade and matches the hardware it models. */
function buildBank(): Float32Array[] {
  const bank: Float32Array[] = [];
  for (let t = 0; t < TABLES; t++) {
    const w = new Float32Array(LEN + 1);
    let peak = 0;
    for (let n = 1; n <= HARM; n++) {
      const a = amp(t, n);
      if (a === 0) continue;
      for (let i = 0; i < LEN; i++) w[i] = (w[i] ?? 0) + a * Math.sin((TP * n * i) / LEN);
    }
    for (let i = 0; i < LEN; i++) peak = Math.max(peak, Math.abs(w[i] ?? 0));
    if (peak > 0) for (let i = 0; i < LEN; i++) w[i] = (w[i] ?? 0) / peak;
    w[LEN] = w[0] ?? 0;
    bank.push(w);
  }
  return bank;
}

const BANK = buildBank();

class Wavetable extends Base {
  ph = 0;

  defaults(): Params {
    return { tune: 0, fine: 0, pos: 0, posA: 0, fm: 0 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const vo = ch(I, 0),
      pcv = ch(I, 1),
      fmc = ch(I, 2);
    const out = O[0]?.[0];
    if (!out) return true;
    const { tune = 0, fine = 0, pos = 0, fm = 0 } = this.p;
    for (let i = 0; i < out.length; i++) {
      const v = tune + fine / 12 + (vo?.[i] ?? 0) + (fmc?.[i] ?? 0) * fm * 0.2;
      const f = clamp(261.626 * Math.pow(2, v), 0.05, sampleRate * 0.45);
      this.ph += f / sampleRate;
      if (this.ph >= 1) this.ph -= 1;
      // scan: two adjacent tables, crossfaded — never a jump to the nearest one
      const p = clamp(pos + (pcv?.[i] ?? 0) / 5, 0, 1) * (TABLES - 1);
      const t0 = Math.min(TABLES - 2, p | 0);
      const mixT = p - t0;
      const a = BANK[t0] ?? BANK[0]!,
        b = BANK[t0 + 1] ?? BANK[0]!;
      const x = this.ph * LEN;
      const j = x | 0;
      const fr = x - j;
      const va = (a[j] ?? 0) + ((a[j + 1] ?? 0) - (a[j] ?? 0)) * fr;
      const vb = (b[j] ?? 0) + ((b[j + 1] ?? 0) - (b[j] ?? 0)) * fr;
      out[i] = clamp(va + (vb - va) * mixT, -1, 1) * 5;
    }
    return true;
  }
}

registerProcessor('wavetable', Wavetable);
