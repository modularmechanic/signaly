import { afterEach, describe, expect, it, vi } from 'vitest';
import { provider } from './anthropic';

const KEY = 'sk-ant-secret-value';

const respond = (body: unknown, ok = true, status = 200): typeof fetch =>
  vi.fn(() =>
    Promise.resolve({ ok, status, text: () => Promise.resolve(JSON.stringify(body)) }),
  ) as unknown as typeof fetch;

const lastCall = (): [string, RequestInit] => {
  const mock = vi.mocked(globalThis.fetch);
  return mock.mock.calls[0] as unknown as [string, RequestInit];
};

afterEach(() => vi.unstubAllGlobals());

describe('anthropic provider', () => {
  it('forces JSON with a single tool and opts into browser access', async () => {
    const input = { slug: 'wobble' };
    vi.stubGlobal('fetch', respond({ content: [{ type: 'tool_use', name: 'emit_module', input }] }));
    const out = await provider.chatJson(KEY, 'test-model', 'SYSTEM', 'USER', { type: 'object' });
    expect(out).toEqual(input);
    const [url, init] = lastCall();
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    const headers = init.headers as Record<string, string>;
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(headers['anthropic-version']).toBe('2023-06-01');
    expect(headers['x-api-key']).toBe(KEY);
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'emit_module' });
    expect(body.model).toBe('test-model');
    expect(body.system).toBe('SYSTEM');
  });

  it('fails when no tool_use block comes back', async () => {
    vi.stubGlobal('fetch', respond({ content: [{ type: 'text', text: 'hello' }] }));
    await expect(provider.chatJson(KEY, 'test-model', 's', 'u', {})).rejects.toThrow(/no module payload/);
  });

  it('surfaces the provider error message without the key', async () => {
    vi.stubGlobal('fetch', respond({ error: { message: 'invalid x-api-key' } }, false, 401));
    await expect(provider.listModels(KEY)).rejects.toThrow(/invalid x-api-key/);
  });

  it('lists model ids', async () => {
    vi.stubGlobal('fetch', respond({ data: [{ id: 'test-model' }, { id: 'other-model' }, {}] }));
    expect(await provider.listModels(KEY)).toEqual(['test-model', 'other-model']);
  });

  it('has no image generation', () => {
    expect(provider.image).toBeUndefined();
  });
});
