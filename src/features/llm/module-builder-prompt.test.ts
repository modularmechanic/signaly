import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SYSTEM_PROMPT } from './module-builder-prompt';

class FakeProcessor {
  port: { onmessage: ((e: MessageEvent) => void) | null } = { onmessage: null };
}

let preludeExports: string[];

beforeAll(async () => {
  vi.stubGlobal('sampleRate', 48000);
  vi.stubGlobal('AudioWorkletProcessor', FakeProcessor);
  preludeExports = Object.keys(await import('../../engine/dsp-prelude'));
});

describe('module-builder-prompt', () => {
  it('lists every symbol the prelude actually exposes to worklet scope', () => {
    expect(preludeExports.length).toBeGreaterThan(0);
    for (const name of preludeExports) {
      expect(SYSTEM_PROMPT).toMatch(new RegExp(`\\b${name}\\b`));
    }
  });
});
