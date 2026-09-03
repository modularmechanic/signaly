import { getKeys, PROVIDERS, type Provider } from '../../storage/api-key-store';
import { readJson, writeJson } from '../../storage/local-json';

// Separate from client.ts on purpose: Settings needs the current provider without
// pulling the provider HTTP clients into the rack chunk.
const PREF_KEY = 'signaly.llm-provider.v1';

const isProviderId = (v: unknown): v is Provider => PROVIDERS.includes(v as Provider);

/** The user's pick when it still has a key, else the first provider that has one. */
export function activeProvider(): Provider | null {
  const keys = getKeys();
  const pref = readJson<string>(PREF_KEY, '');
  if (isProviderId(pref) && keys[pref]) return pref;
  return PROVIDERS.find((p) => keys[p]) ?? null;
}

export function setActiveProvider(id: Provider): void {
  writeJson(PREF_KEY, id);
}
