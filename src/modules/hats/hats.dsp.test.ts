import { beforeAll, describe, expect, it, vi } from 'vitest';

const SR = 48000;
const N = 128;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let Hats: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./hats.dsp');
  Hats = reg.mock.calls[0]![1] as Ctor;
});

/** Render `secs`, pulsing OPEN and CLOSED at the given times in seconds. */
function render(p: Record<string, number>, secs: number, openAt: number[], closedAt: number[]): Float32Array {
  const h = new Hats({ processorOptions: { p } });
  const blocks = Math.ceil((secs * SR) / N);
  const hi = new Float32Array(N).fill(5);
  const lo = new Float32Array(N);
  const O = [[new Float32Array(N)]];
  const all = new Float32Array(blocks * N);
  const blockOf = (t: number): number => Math.round((t * SR) / N);
  const openBlocks = new Set(openAt.map(blockOf));
  const closedBlocks = new Set(closedAt.map(blockOf));
  for (let b = 0; b < blocks; b++) {
    h.process([[closedBlocks.has(b) ? hi : lo], [openBlocks.has(b) ? hi : lo], []], O);
    all.set(O[0]?.[0] ?? lo, b * N);
  }
  return all;
}

const rms = (x: Float32Array, from: number, to: number): number => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += (x[i] ?? 0) ** 2;
  return Math.sqrt(sum / (to - from));
};

const peak = (x: Float32Array): number => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);

const P = { tone: 5000, cdec: 0.02, odec: 1.5, metal: 0.8, level: 1 };

describe('hats.dsp', () => {
  it('is silent until triggered', () => {
    expect(peak(render(P, 1, [], []))).toBe(0);
  });

  it('chokes a ringing open hat when a closed trigger arrives', () => {
    const ringing = render(P, 0.8, [0], []);
    const choked = render(P, 0.8, [0], [0.2]);
    const win = [Math.round(0.4 * SR), Math.round(0.6 * SR)] as const;
    // Both hats sound: the open tail is loud well after its own trigger.
    expect(rms(ringing, win[0], win[1])).toBeGreaterThan(0.3);
    // The closed hit at 0.2 s replaces that tail with its own 20 ms decay.
    expect(rms(choked, win[0], win[1])).toBeLessThan(rms(ringing, win[0], win[1]) / 100);
    expect(rms(choked, Math.round(0.2 * SR), Math.round(0.21 * SR))).toBeGreaterThan(0.3);
  });

  it('holds the open tail far longer than the closed one', () => {
    const closedOnly = render(P, 0.8, [], [0]);
    const openOnly = render(P, 0.8, [0], []);
    const late = [Math.round(0.3 * SR), Math.round(0.5 * SR)] as const;
    expect(rms(openOnly, late[0], late[1])).toBeGreaterThan(rms(closedOnly, late[0], late[1]) * 100);
  });

  it('stays inside +/-5 V and keeps its bank inharmonic at METAL 1', () => {
    const hot = render({ ...P, metal: 1, tone: 800 }, 0.3, [0], []);
    expect(peak(hot)).toBeLessThanOrEqual(5);
    expect(hot.every(Number.isFinite)).toBe(true);
    // A harmonic bank repeats at the 317 Hz base period; an inharmonic one does not.
    const period = Math.round(SR / 317);
    const start = Math.round(0.05 * SR);
    let drift = 0;
    for (let i = start; i < start + 4000; i++) drift += Math.abs((hot[i] ?? 0) - (hot[i + period] ?? 0));
    expect(drift / 4000).toBeGreaterThan(0.05);
  });
});
