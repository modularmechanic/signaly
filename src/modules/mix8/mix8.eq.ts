// MIX 8's per-channel three-band EQ. Worklet-safe: no main-thread globals in here.

export const NCH = 8;
/** Band 0 is a low shelf at LO_F, band 1 a peaking mid with its own frequency knob, band 2 a high
    shelf at HI_F — the classic console channel strip. */
export const NB = 3;
export const LO_F = 90;
export const MID_F = 1000;
export const HI_F = 8000;
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
