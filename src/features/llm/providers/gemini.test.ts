import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from './gemini';

const KEY = 'AIza-secret-value';

const respond = (body: unknown): typeof fetch =>
  vi.fn(() =>
    Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(body)) }),
  ) as unknown as typeof fetch;

const lastCall = (): [string, RequestInit] => {
  const mock = vi.mocked(globalThis.fetch);
  return mock.mock.calls[0] as unknown as [string, RequestInit];
};

const headers = (init: RequestInit): Record<string, string> => init.headers as Record<string, string>;

afterEach(() => vi.unstubAllGlobals());

describe('gemini provider', () => {
  it('sends the key as a header, never in the chatJson URL', async () => {
    const payload = { slug: 'wobble' };
    vi.stubGlobal(
      'fetch',
      respond({ candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }] }),
    );
    expect(await provider.chatJson(KEY, 'gemini-test', 'SYSTEM', 'USER', { type: 'object' })).toEqual(
      payload,
    );
    const [url, init] = lastCall();
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(url).not.toContain('key=');
    expect(url).not.toContain(KEY);
    expect(headers(init)['x-goog-api-key']).toBe(KEY);
  });

  it('sends the key as a header, never in the listModels URL', async () => {
    vi.stubGlobal('fetch', respond({ models: [{ name: 'models/gemini-test' }] }));
    expect(await provider.listModels(KEY)).toEqual(['gemini-test']);
    const [url, init] = lastCall();
    expect(url).not.toContain('key=');
    expect(url).not.toContain(KEY);
    expect(headers(init)['x-goog-api-key']).toBe(KEY);
  });

  it('sends the key as a header, never in the image URL', async () => {
    const inlineData = { mimeType: 'image/png', data: btoa('png-bytes') };
    vi.stubGlobal('fetch', respond({ candidates: [{ content: { parts: [{ inlineData }] } }] }));
    const { image } = provider;
    if (!image) throw new Error('the gemini provider must expose image()');
    const blob = await image(KEY, 'gemini-image', 'a faceplate');
    expect(blob.type).toBe('image/png');
    const [url, init] = lastCall();
    expect(url).not.toContain('key=');
    expect(url).not.toContain(KEY);
    expect(headers(init)['x-goog-api-key']).toBe(KEY);
  });
});
