const MAX_ERR = 300;
/** Generous on purpose: a slow model — image generation especially — is not a hung request. */
const TIMEOUT_MS = 120_000;

type Headers = Record<string, string>;

function pickMessage(data: unknown): string | null {
  const from = (o: unknown): string | null => {
    if (typeof o === 'string') return o;
    if (typeof o === 'object' && o !== null) {
      const m = (o as { message?: unknown }).message;
      if (typeof m === 'string') return m;
    }
    return null;
  };
  if (typeof data !== 'object' || data === null) return null;
  return from((data as { error?: unknown }).error) ?? from(data);
}

// The URL is never quoted back into an error: a provider that ever takes the key as a query
// parameter would leak it there. (Signaly's own providers all use headers.)
async function request(url: string, init: RequestInit, what: string): Promise<unknown> {
  let res: Response;
  let text: string;
  try {
    // Without a deadline an unanswered request leaves the caller's UI pending with no way out.
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    text = await res.text();
  } catch (e) {
    // Split before the catch-all, or the deadline reads as an unreachable provider.
    const name = (e as { name?: string } | null)?.name;
    const timedOut = name === 'TimeoutError' || name === 'AbortError';
    return Promise.reject(
      new Error(
        timedOut
          ? `${what} did not answer within ${TIMEOUT_MS / 1000} s — try again`
          : `${what} could not be reached — check the network and the key`,
      ),
    );
  }
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* provider returned a non-JSON body */
  }
  if (!res.ok) throw new Error(`${what}: ${(pickMessage(data) ?? `HTTP ${res.status}`).slice(0, MAX_ERR)}`);
  return data;
}

export function postJson(url: string, headers: Headers, body: unknown, what: string): Promise<unknown> {
  return request(
    url,
    {
      method: 'POST',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
    what,
  );
}

export function getJson(url: string, headers: Headers, what: string): Promise<unknown> {
  return request(url, { headers }, what);
}

export function b64Blob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'unexpected error');

/** Last line of defence: a key must never survive into anything the UI renders. */
export const scrub = (message: string, key?: string): string =>
  key && key.length > 3 ? message.split(key).join('[key]') : message;

export function dig(data: unknown, ...path: (string | number)[]): unknown {
  let node: unknown = data;
  for (const step of path) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string | number, unknown>)[step];
  }
  return node;
}
