import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom has no IndexedDB; stand in for idb-keyval with an in-memory map so the store's own
// get/set/del wiring is what's under test, not a browser API this environment can't provide.
const mem = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: (k: string) => Promise.resolve(mem.get(k)),
  set: (k: string, v: unknown) => {
    mem.set(k, v);
    return Promise.resolve();
  },
  del: (k: string) => {
    mem.delete(k);
    return Promise.resolve();
  },
}));

const {
  getSample,
  MAX_SAMPLE_BYTES,
  MAX_SAMPLE_SECONDS,
  newSampleId,
  removeSample,
  saveSample,
  sampleLimitError,
} = await import('./sample-store');

beforeEach(() => mem.clear());

describe('sample-store', () => {
  it('round-trips a blob by id', async () => {
    const id = newSampleId();
    const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' });
    await saveSample(id, blob);
    const back = await getSample(id);
    expect(back).toBe(blob);
  });

  it('returns undefined for an id that was never saved, or was removed', async () => {
    expect(await getSample('missing')).toBeUndefined();
    const id = newSampleId();
    await saveSample(id, new Blob(['x']));
    await removeSample(id);
    expect(await getSample(id)).toBeUndefined();
  });

  describe('sampleLimitError', () => {
    it('rejects a file over the byte limit', () => {
      expect(sampleLimitError(MAX_SAMPLE_BYTES + 1)).toMatch(/larger/);
      expect(sampleLimitError(MAX_SAMPLE_BYTES)).toBeNull();
    });

    it('rejects audio longer than the second limit, only once size passes', () => {
      expect(sampleLimitError(1024, MAX_SAMPLE_SECONDS + 1)).toMatch(/longer/);
      expect(sampleLimitError(1024, MAX_SAMPLE_SECONDS)).toBeNull();
      expect(sampleLimitError(1024)).toBeNull();
    });
  });
});
