import { Base, ch, clamp, TP, type Params } from '../../engine/dsp-prelude';

const SHIFT_RANGE = 1000; // matches the SHIFT knob's +/-1000 Hz span
const N = 65; // FIR Hilbert transformer length (odd)
const HALF = (N - 1) / 2;

/** A windowed-sinc FIR Hilbert transformer (h[k]=2/(pi*k) at odd offsets, Hamming-windowed,
    zero at even offsets) built once at module load -- the "pair of allpass chains 90 degrees
    apart" from the plan, done as an FIR instead so the coefficients are derived, not copied
    from a table. KER[a] is the tap for the sample `a` steps behind the write head; the matched
    "direct" sample sits at the centre tap, a = HALF steps back. Single-sideband shift is then
    the standard quadrature modulation: up = x*cos + xHat*sin, down = x*cos - xHat*sin (the
    sign that lands UP depends on this FIR's own phase convention, verified against a test
    tone rather than assumed from the textbook formula). */
const KER = new Float64Array(N);
for (let a = 0; a < N; a++) {
  const o = HALF - a;
  if (o === 0 || o % 2 === 0) continue;
  const w = 0.54 + 0.46 * Math.cos((Math.PI * o) / HALF);
  KER[a] = (2 / (Math.PI * o)) * w;
}

class FreqShift extends Base {
  buf = new Float64Array(N);
  wp = 0;
  ph = 0;

  defaults(): Params {
    return { shift: 100, mix: 0.5 };
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inp = ch(I, 0),
      scv = ch(I, 1);
    const up = O[0]?.[0],
      down = O[1]?.[0];
    if (!up || !down) return true;
    const p = this.p;
    const mix = clamp(p.mix ?? 0.5, 0, 1);
    for (let i = 0; i < up.length; i++) {
      const x = inp?.[i] ?? 0;
      this.buf[this.wp] = x;
      let xHat = 0;
      for (let a = 0; a < N; a++) xHat += KER[a]! * this.buf[(this.wp - a + N) % N]!;
      const xDelayed = this.buf[(this.wp - HALF + N) % N]!;
      this.wp = (this.wp + 1) % N;

      const shiftHz = clamp(
        (p.shift ?? 100) + ((scv?.[i] ?? 0) / 5) * SHIFT_RANGE,
        -SHIFT_RANGE,
        SHIFT_RANGE,
      );
      this.ph += shiftHz / sampleRate;
      this.ph -= Math.floor(this.ph);
      const c = Math.cos(TP * this.ph),
        s = Math.sin(TP * this.ph);
      const upWet = xDelayed * c + xHat * s;
      const downWet = xDelayed * c - xHat * s;
      up[i] = clamp(xDelayed * (1 - mix) + upWet * mix, -5, 5);
      down[i] = clamp(xDelayed * (1 - mix) + downWet * mix, -5, 5);
    }
    return true;
  }
}

registerProcessor('freqshift', FreqShift);
