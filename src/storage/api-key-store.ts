import { KEYS, readJson, removeJson, writeJson } from './local-json';

export type Provider = 'anthropic' | 'openai' | 'gemini';

export const PROVIDERS: readonly Provider[] = ['anthropic', 'openai', 'gemini'];

/** Keys and the model id chosen for each provider. NEVER log or include these in error payloads. */
export interface ApiKeyState {
  keys: Partial<Record<Provider, string>>;
  models: Partial<Record<Provider, string>>;
}

const isProvider = (p: string): p is Provider => (PROVIDERS as readonly string[]).includes(p);

function read(): ApiKeyState {
  const raw = readJson<Partial<ApiKeyState>>(KEYS.apiKeys, {});
  const pick = (o: unknown): Partial<Record<Provider, string>> => {
    const out: Partial<Record<Provider, string>> = {};
    if (typeof o !== 'object' || o === null) return out;
    for (const [k, v] of Object.entries(o)) if (isProvider(k) && typeof v === 'string' && v) out[k] = v;
    return out;
  };
  return { keys: pick(raw.keys), models: pick(raw.models) };
}

export function getKeys(): Partial<Record<Provider, string>> {
  return read().keys;
}

export function setKey(provider: Provider, key: string): void {
  const state = read();
  const trimmed = key.trim();
  if (trimmed) state.keys[provider] = trimmed;
  else delete state.keys[provider];
  writeJson(KEYS.apiKeys, state);
}

export function hasAnyKey(): boolean {
  return Object.keys(read().keys).length > 0;
}

export function clearKeys(): void {
  removeJson(KEYS.apiKeys);
}

export function getModel(provider: Provider): string | undefined {
  return read().models[provider];
}

export function setModel(provider: Provider, id: string): void {
  const state = read();
  if (id) state.models[provider] = id;
  else delete state.models[provider];
  writeJson(KEYS.apiKeys, state);
}
