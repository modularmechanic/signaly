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

/** Parse a versioned envelope; any malformed / wrong-version payload yields `fallback`. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return fallback;
    const env = parsed as Partial<Envelope<T>>;
    return env.v === 1 && env.data !== undefined ? env.data : fallback;
  } catch {
    return fallback;
  }
}

/** Write a versioned envelope. Quota / private-mode failures are swallowed. */
export function writeJson<T>(key: string, data: T): void {
  if (!askedToPersist) {
    askedToPersist = true;
    void navigator.storage?.persist?.().catch(() => undefined);
  }
  try {
    const env: Envelope<T> = { v: 1, data };
    localStorage.setItem(key, JSON.stringify(env));
  } catch {
    /* QuotaExceededError / storage disabled */
  }
}

export function removeJson(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage disabled */
  }
}
