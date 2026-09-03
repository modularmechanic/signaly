/** Pure meter maths for MAIN OUT. The rack's nominal signal range is ±5 V, so
    full-scale (0 dBFS) is a 5 V peak. */
const FLOOR = 1e-12;

export function rms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i] ?? 0;
    sum += s * s;
  }
  return Math.sqrt(sum / samples.length);
}

/** Pearson correlation of a stereo pair: +1 mono, 0 uncorrelated, −1 out of phase. */
export function stereoCorrelation(left: Float32Array, right: Float32Array): number {
  const n = Math.min(left.length, right.length);
  let dot = 0;
  let lp = 0;
  let rp = 0;
  for (let i = 0; i < n; i++) {
    const l = left[i] ?? 0;
    const r = right[i] ?? 0;
    dot += l * r;
    lp += l * l;
    rp += r * r;
  }
  const den = Math.sqrt(lp * rp);
  return den > FLOOR ? Math.max(-1, Math.min(1, dot / den)) : 0;
}

/** Exponential integration step over mean-square values; 400 ms = momentary loudness. */
export function smoothMeanSquare(
  current: number,
  target: number,
  elapsedSeconds: number,
  windowSeconds = 0.4,
): number {
  const alpha = 1 - Math.exp(-Math.max(0, elapsedSeconds) / windowSeconds);
  return current + (Math.max(0, target) - current) * alpha;
}

export function meanSquareToLufs(meanSquare: number): number {
  return Math.max(-90, -0.691 + 10 * Math.log10(Math.max(meanSquare, FLOOR)));
}

export function voltsToDbfs(volts: number): number {
  return Math.max(-90, 20 * Math.log10(Math.max(Math.abs(volts) / 5, FLOOR)));
}

/** Equal-power stereo mean-square, normalised to the ±5 V range. */
export function stereoMeanSquare(left: Float32Array, right: Float32Array): number {
  const l = rms(left) / 5;
  const r = rms(right) / 5;
  return (l * l + r * r) * 0.5;
}
