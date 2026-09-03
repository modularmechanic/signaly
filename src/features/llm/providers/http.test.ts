import { afterEach, describe, expect, it, vi } from 'vitest';
import { getJson } from './http';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

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

  it('aborts a provider that never answers, and says so', async () => {
    // Real timers only fire the deadline after two minutes, so the clock is the one thing stubbed;
    // the signal itself, fetch's use of it and the message mapping are the real code.
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      const c = new AbortController();
      setTimeout(() => c.abort(new DOMException('timed out', 'TimeoutError')), 0);
      return c.signal;
    });
    // A mock that ignores init.signal never rejects, so this test would hang rather than pass:
    // honouring the signal is the whole point.
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => reject(init.signal?.reason as Error));
          }),
      ),
    );
    await expect(getJson('https://example.test', {}, 'Claude models')).rejects.toThrow(
      /Claude models did not answer within 120 s/,
    );
    expect(timeout).toHaveBeenCalledWith(120_000);
    timeout.mockRestore();
  });

  it('reports a timeout instead of hanging, without the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('aborted', 'TimeoutError'))),
    );
    await expect(getJson('https://example.test?key=secret', {}, 'Claude models')).rejects.toThrow(
      /Claude models did not answer within 120 s/,
    );
  });

  it('treats a plain abort as a deadline, not an unreachable provider', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new DOMException('aborted', 'AbortError'))),
    );
    await expect(getJson('https://example.test', {}, 'Claude models')).rejects.toThrow(
      /did not answer within/,
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
