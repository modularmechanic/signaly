import { beforeAll, describe, expect, it, vi } from 'vitest';

const SR = 48000;

class FakeProcessor {
  port = { onmessage: null as ((e: MessageEvent) => void) | null, postMessage: vi.fn() };
}

interface Proc {
  process(I: Float32Array[][], O: Float32Array[][]): boolean;
  port: { postMessage: ReturnType<typeof vi.fn> };
}
type Ctor = new (o?: { processorOptions?: { p?: Record<string, number> } }) => Proc;

let ClockDiv: Ctor;

beforeAll(async () => {
  vi.stubGlobal('sampleRate', SR);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  const reg = vi.fn();
  vi.stubGlobal('registerProcessor', reg);
  await import('./clockdiv.dsp');
  ClockDiv = reg.mock.calls[0]![1] as Ctor;
});

/** Run `blocks` of 128 samples with a 50% duty clock of `period` samples. */
function run(c: Proc, blocks: number, period: number): void {
  const O = [[new Float32Array(128)]];
  for (let b = 0; b < blocks; b++) {
    const clk = new Float32Array(128);
    for (let i = 0; i < 128; i++) clk[i] = (b * 128 + i) % period < period / 2 ? 5 : 0;
    c.process([[clk]], O);
  }
}

describe('clockdiv.dsp', () => {
  it('posts an edge-triggered led message and never repeats a value', () => {
    const c = new ClockDiv({ processorOptions: { p: { div: 2 } } });
    run(c, 200, 4000);
    const led = c.port.postMessage.mock.calls.map(([m]) => m as { t: string; id: string; v: number });
    expect(led.length).toBeGreaterThan(2);
    expect(led.every((m) => m.t === 'led' && m.id === 'clk')).toBe(true);
    expect(led.map((m) => m.v)).toEqual(led.map((_, i) => (i % 2 === 0 ? 1 : 0)));
  });

  it('stays dark with no clock patched', () => {
    const c = new ClockDiv();
    const O = [[new Float32Array(128)]];
    for (let b = 0; b < 50; b++) c.process([], O);
    expect(c.port.postMessage).not.toHaveBeenCalled();
  });
});
