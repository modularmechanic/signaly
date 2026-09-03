import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyDsp } from './dsp-verify';

const buffer = (samples: number[]): AudioBuffer =>
  ({ numberOfChannels: 1, getChannelData: () => Float32Array.from(samples) }) as unknown as AudioBuffer;

function stubAudio(render: () => Promise<AudioBuffer>): void {
  class FakeContext {
    destination = {};
    audioWorklet = { addModule: (): Promise<void> => Promise.resolve() };
    startRendering = render;
  }
  class FakeNode {
    connect(): void {}
  }
  vi.stubGlobal('OfflineAudioContext', FakeContext);
  vi.stubGlobal('AudioWorkletNode', FakeNode);
  URL.createObjectURL = vi.fn(() => 'blob:test');
  URL.revokeObjectURL = vi.fn();
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('verifyDsp', () => {
  it('passes a finite in-range render and revokes the blob url', async () => {
    stubAudio(() => Promise.resolve(buffer([0, 0.5, -0.5, 4.9])));
    expect(await verifyDsp('code', 'user:a@1', 1)).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  });

  it('rejects NaN output', async () => {
    stubAudio(() => Promise.resolve(buffer([0, NaN])));
    expect(await verifyDsp('code', 'user:a@1', 1)).toMatch(/NaN/);
  });

  it('rejects samples outside the sane range', async () => {
    stubAudio(() => Promise.resolve(buffer([0, 250])));
    expect(await verifyDsp('code', 'user:a@1', 1)).toMatch(/out-of-range/);
  });

  it('gives up on a render that never returns', async () => {
    stubAudio(() => new Promise<AudioBuffer>(() => undefined));
    vi.useFakeTimers();
    const pending = verifyDsp('code', 'user:a@1', 1);
    await vi.advanceTimersByTimeAsync(3100);
    expect(await pending).toMatch(/did not render/);
  });

  it('reports an addModule failure instead of throwing', async () => {
    stubAudio(() => Promise.resolve(buffer([0])));
    class Broken {
      destination = {};
      audioWorklet = { addModule: (): Promise<void> => Promise.reject(new Error('bad syntax')) };
      startRendering = (): Promise<AudioBuffer> => Promise.resolve(buffer([0]));
    }
    vi.stubGlobal('OfflineAudioContext', Broken);
    expect(await verifyDsp('code', 'user:a@1', 1)).toBe('bad syntax');
  });

  it('says so when offline rendering is unavailable', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:test');
    expect(await verifyDsp('code', 'user:a@1', 1)).toMatch(/unavailable/);
  });
});
