// Shared by the worklet DSP and the panel curve: no main-thread or worklet globals in here.

export const NCH = 8;
export const NB = 4;
/** Band 0 is a low shelf, band 3 a high shelf, 1 and 2 are peaking — classic console voicing. */
export const EQ_F = [90, 400, 2000, 8000];
export const EQ_Q = 0.9;

/** RBJ cookbook coefficients, normalised by a0, written as b0,b1,b2,a1,a2 at `co[at]`. */
export function biquad(
  band: number,
  f: number,
  gainDb: number,
  q: number,
  sr: number,
  co: Float64Array,
  at: number,
): void {
  const w = (2 * Math.PI * Math.min(Math.max(f, 10), sr * 0.45)) / sr;
  const cw = Math.cos(w);
  const sw = Math.sin(w);
  const A = Math.pow(10, Math.max(-24, Math.min(24, gainDb)) / 40);
  let b0: number, b1: number, b2: number, a0: number, a1: number, a2: number;
  if (band === 0) {
    const tsa = sw * Math.sqrt(A) * Math.sqrt(Math.max(0.05, (A + 1 / A) * (Math.max(0.3, q) - 1) + 2));
    b0 = A * (A + 1 - (A - 1) * cw + tsa);
    b1 = 2 * A * (A - 1 - (A + 1) * cw);
    b2 = A * (A + 1 - (A - 1) * cw - tsa);
    a0 = A + 1 + (A - 1) * cw + tsa;
    a1 = -2 * (A - 1 + (A + 1) * cw);
    a2 = A + 1 + (A - 1) * cw - tsa;
  } else if (band === NB - 1) {
    const tsa = sw * Math.sqrt(A) * Math.sqrt(Math.max(0.05, (A + 1 / A) * (Math.max(0.3, q) - 1) + 2));
    b0 = A * (A + 1 + (A - 1) * cw + tsa);
    b1 = -2 * A * (A - 1 + (A + 1) * cw);
    b2 = A * (A + 1 + (A - 1) * cw - tsa);
    a0 = A + 1 - (A - 1) * cw + tsa;
    a1 = 2 * (A - 1 - (A + 1) * cw);
    a2 = A + 1 - (A - 1) * cw - tsa;
  } else {
    const al = sw / (2 * Math.max(0.1, q));
    b0 = 1 + al * A;
    b1 = -2 * cw;
    b2 = 1 - al * A;
    a0 = 1 + al / A;
    a1 = -2 * cw;
    a2 = 1 - al / A;
  }
  co[at] = b0 / a0;
  co[at + 1] = b1 / a0;
  co[at + 2] = b2 / a0;
  co[at + 3] = a1 / a0;
  co[at + 4] = a2 / a0;
}

/** Magnitude of the biquad at `co[at]` in dB — drives the panel curve. */
export function magDb(co: Float64Array, at: number, f: number, sr: number): number {
  const w = (2 * Math.PI * f) / sr;
  const c1 = Math.cos(w);
  const s1 = Math.sin(w);
  const c2 = Math.cos(2 * w);
  const s2 = Math.sin(2 * w);
  const b0 = co[at] ?? 0;
  const b1 = co[at + 1] ?? 0;
  const b2 = co[at + 2] ?? 0;
  const a1 = co[at + 3] ?? 0;
  const a2 = co[at + 4] ?? 0;
  const nr = b0 + b1 * c1 + b2 * c2;
  const ni = -(b1 * s1 + b2 * s2);
  const dr = 1 + a1 * c1 + a2 * c2;
  const di = -(a1 * s1 + a2 * s2);
  return 10 * Math.log10(Math.max(1e-12, (nr * nr + ni * ni) / Math.max(1e-12, dr * dr + di * di)));
}
