export const KEYS = {
  patches: 'signaly.patches.v1',
  settings: 'signaly.settings.v1',
  apiKeys: 'signaly.api-keys.v1',
  userModules: 'signaly.user-modules.v1',
} as const;

interface Envelope<T> {
  v: 1;
  data: T;
}

let askedToPersist = false;

/** Array / plain object / primitive — a stored value of another kind must never reach a caller. */
const kind = (v: unknown): string => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);

/**
 * Parse a versioned envelope; any malformed / wrong-version / wrong-shape payload yields `fallback`.
 * `store` lets secrets live in `sessionStorage` while everything else stays in `localStorage`.
 */
export function readJson<T>(key: string, fallback: T, store: Storage = localStorage): T {
  try {
    const raw = store.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const env = parsed as Partial<Envelope<T>>;
    return env.v === 1 && kind(env.data) === kind(fallback) ? (env.data as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Write a versioned envelope. Quota / private-mode failures are swallowed. */
export function writeJson<T>(key: string, data: T, store: Storage = localStorage): void {
  if (!askedToPersist) {
    askedToPersist = true;
    void navigator.storage?.persist?.().catch(() => undefined);
  }
  try {
    const env: Envelope<T> = { v: 1, data };
    store.setItem(key, JSON.stringify(env));
  } catch {
    /* QuotaExceededError / storage disabled */
  }
}

export function removeJson(key: string, store: Storage = localStorage): void {
  try {
    store.removeItem(key);
  } catch {
    /* storage disabled */
  }
}
