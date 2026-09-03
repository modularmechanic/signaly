import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJson } from './http';

afterEach(() => vi.unstubAllGlobals());

describe('provider request', () => {
  it('gives every request a deadline', async () => {
    let init: RequestInit | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((...args: [string, RequestInit?]) => {
        init = args[1];
        return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('{}') });
      }),
    );
    await getJson('https://example.test', {}, 'Claude models');
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('reports a timeout instead of hanging, without the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('aborted', 'TimeoutError'))),
    );
    await expect(getJson('https://example.test?key=secret', {}, 'Claude models')).rejects.toThrow(
      /Claude models timed out after 60s/,
    );
  });

  it('still reports an unreachable provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('failed to fetch'))),
    );
    await expect(getJson('https://example.test', {}, 'Claude models')).rejects.toThrow(
      /could not be reached/,
    );
  });
});
