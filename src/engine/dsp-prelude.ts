/// <reference types="@types/audioworklet" />
// WORKLET-ONLY. Imported by every `<id>.dsp.ts`; never from the main thread.
// Signals are volts: audio ±5V, gates 0/+5V, pitch CV 1V/oct (0V = C4).

export const TP = Math.PI * 2;

export const clamp = (x: number, a: number, b: number): number => (x < a ? a : x > b ? b : x);

/** −360 dBFS: below this counts as silence, and far above float32/float64 subnormals. */
export const DENORMAL = 1e-18;

/** Denormal flush for recursive state — lands on exact 0 so silent tails stop costing CPU.
    Side effects, both deliberate: flush(NaN) === 0 and -0 normalises to 0. */
export const flush = (x: number): number => (x > DENORMAL || x < -DENORMAL ? x : 0);

/** First channel of input `n`, or null when that input is unpatched/silent. */
export const ch = (I: Float32Array[][], n: number): Float32Array | null => {
  const c = I[n]?.[0];
  return c && c.length ? c : null;
};

/** PolyBLEP step correction for band-limited saw / square edges. */
export function blep(t: number, dt: number): number {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }
  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }
  return 0;
}

/** Oscillator shapes at phase `t` (0..1): 0 sin, 1 tri, 2 saw, 3 square. */
export function oscW(wave: number, t: number, dt: number): number {
  if (wave === 0) return Math.sin(TP * t);
  if (wave === 1) {
    const s = 2 * t - 1 - blep(t, dt);
    return 2 * (s < 0 ? -s : s) - 1; // cheap tri
  }
  if (wave === 2) return 2 * t - 1 - blep(t, dt);
  return (t < 0.5 ? 1 : -1) + blep(t, dt) - blep((t + 0.5) % 1, dt);
}

/** Flat param bag: knob/switch id -> current numeric value. */
export type Params = Record<string, number>;

export interface BaseOptions {
  processorOptions?: { p?: Params };
}

/** Inbound message from the main thread (param push + custom). */
export interface InMsg {
  t?: string;
  id?: string;
  v?: number;
  [k: string]: unknown;
}

/** Base processor every module DSP class extends. Subclasses implement `process()`. */
export class Base extends AudioWorkletProcessor {
  p: Params;
  onParam?(id: string, v: number): void;
  msg?(m: InMsg): void;

  constructor(o?: BaseOptions) {
    super();
    this.p = { ...this.defaults() };
    if (o?.processorOptions?.p) Object.assign(this.p, o.processorOptions.p);
    this.port.onmessage = (e: MessageEvent): void => {
      const raw: unknown = e.data;
      if (typeof raw !== 'object' || raw === null) return;
      const m = raw as InMsg;
      if (m.t === 'p' && typeof m.id === 'string' && typeof m.v === 'number' && Number.isFinite(m.v)) {
        this.p[m.id] = m.v;
        this.onParam?.(m.id, m.v);
      } else if (this.msg) {
        this.msg(m);
      }
    };
  }

  /** Default param values, overridden per module. */
  defaults(): Params {
    return {};
  }
}

/** Fractional delay line with linear interpolation. */
export class DL {
  b: Float32Array;
  w: number;
  n: number;

  constructor(n: number) {
    this.b = new Float32Array(Math.max(4, n | 0));
    this.w = 0;
    this.n = this.b.length;
  }

  push(x: number): void {
    // Every delay line in the rack writes through here, so flush once, here.
    this.b[this.w] = flush(x);
    this.w = (this.w + 1) % this.n;
  }

  /** Read `d` samples back (fractional). */
  read(d: number): number {
    d = clamp(d, 0, this.n - 2);
    let r = this.w - 1 - d;
    while (r < 0) r += this.n;
    const i0 = r | 0;
    const fr = r - i0;
    const i1 = (i0 + 1) % this.n;
    return (this.b[i0] ?? 0) * (1 - fr) + (this.b[i1] ?? 0) * fr;
  }
}

/** One-pole coefficient for a time constant in MILLISECONDS at the live sampleRate.
    Call at construction or block rate, never per sample (it costs an exp). */
export const onePoleCoeff = (tauMs: number): number =>
  tauMs > 0 ? 1 - Math.exp(-1000 / (tauMs * sampleRate)) : 1;

/** One-pole LOW-PASS coefficient for a cutoff in HERTZ at the live sampleRate. */
export const lpCoeff = (hz: number): number => 1 - Math.exp((-TP * hz) / sampleRate);

/** Exponential smoother with a sample-rate-correct time constant. */
export class OnePole {
  a: number;
  y: number;

  constructor(tauMs = 0, init = 0) {
    this.a = onePoleCoeff(tauMs);
    this.y = init;
  }

  setTau(tauMs: number): void {
    this.a = onePoleCoeff(tauMs);
  }

  process(x: number): number {
    this.y = flush(this.y + (x - this.y) * this.a);
    return this.y;
  }
}

/** Tempo from a patched clock gate: samples between rising edges (>2.5V). */
export class ClockSync {
  last = 0;
  cnt = 0;
  period = 0;

  tick(g: number): number {
    this.cnt++;
    if (g > 2.5 && this.last <= 2.5) {
      if (this.cnt > 4 && this.cnt < sampleRate * 8) {
        this.period = this.period > 0 ? this.period + (this.cnt - this.period) * 0.5 : this.cnt;
      }
      this.cnt = 0;
    }
    this.last = g;
    return this.period;
  }
}

/** Sync divisions as a multiple of ONE clock pulse; index 0 = FREE sentinel.
    Switch labels must line up: ['FREE','1/1','1/2','1/4.','1/4','1/8.','1/8','1/8T','1/16','1/16T']. */
export const SYNC_DIV = [0, 4, 2, 1.5, 1, 0.75, 0.5, 1 / 3, 0.25, 1 / 6];

/** Linear congruential noise: reproducible per instance, unlike Math.random. */
export class Lcg {
  s: number;

  constructor(seed: number) {
    this.s = seed;
  }

  /** Next value in -1..1. */
  next(): number {
    // Math.imul keeps the product in 32 bits; plain * loses the low bits past 2^53.
    this.s = (Math.imul(this.s, 1103515245) + 12345) & 0x7fffffff;
    return this.s / 0x3fffffff - 1;
  }
}

/** Linear-interpolated read of `buf` at fractional `pos`, clamped to the buffer's ends. */
export function readLinear(buf: Float32Array, pos: number): number {
  const n = buf.length;
  const p = pos < 0 ? 0 : pos > n - 1 ? n - 1 : pos;
  const i0 = Math.floor(p);
  const frac = p - i0;
  const s0 = buf[i0] ?? 0;
  const s1 = buf[i0 + 1] ?? s0;
  return s0 + (s1 - s0) * frac;
}
