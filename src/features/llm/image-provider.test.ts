import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../storage/api-key-store', () => ({
  getKeys: () => keys,
  getModel: () => 'm',
}));
let keys: Record<string, string> = {};
const load = async () => (await import('./client')).imageProvider();
describe('imageProvider', () => {
  beforeEach(() => vi.resetModules());
  it('prefers gemini when both keys are present', async () => {
    keys = { gemini: 'g', openai: 'o', anthropic: 'a' };
    expect(await load()).toBe('gemini');
  });
  it('falls back to openai when only that key exists', async () => {
    keys = { openai: 'o', anthropic: 'a' };
    expect(await load()).toBe('openai');
  });
  it('is null when only an image-incapable key exists', async () => {
    keys = { anthropic: 'a' };
    expect(await load()).toBeNull();
  });
});
