import { useSettingsStore } from '../state/settings-store';
import { KEYS, readJson, removeJson, writeJson } from './local-json';

export type Provider = 'anthropic' | 'openai' | 'gemini';

export const PROVIDERS: readonly Provider[] = ['anthropic', 'openai', 'gemini'];

/** Keys and the model id chosen for each provider. NEVER log or include these in error payloads. */
export interface ApiKeyState {
  keys: Partial<Record<Provider, string>>;
  models: Partial<Record<Provider, string>>;
}

const isProvider = (p: string): p is Provider => (PROVIDERS as readonly string[]).includes(p);

/**
 * Keys live in `sessionStorage` unless the user opted into remembering them, so closing the tab
 * forgets them. Model ids are not secret and always stay in `localStorage`. When both land in
 * `localStorage` they share one envelope, which is exactly the pre-session-default layout.
 */
const keyStore = (): Storage => (useSettingsStore.getState().rememberKeys ? localStorage : sessionStorage);

const pick = (o: unknown): Partial<Record<Provider, string>> => {
  const out: Partial<Record<Provider, string>> = {};
  if (typeof o !== 'object' || o === null) return out;
  for (const [k, v] of Object.entries(o)) if (isProvider(k) && typeof v === 'string' && v) out[k] = v;
  return out;
};

function read(): ApiKeyState {
  const secret = readJson<Partial<ApiKeyState>>(KEYS.apiKeys, {}, keyStore());
  const plain = readJson<Partial<ApiKeyState>>(KEYS.apiKeys, {}, localStorage);
  return { keys: pick(secret.keys), models: pick(plain.models) };
}

function write(state: ApiKeyState): void {
  const store = keyStore();
  if (store === localStorage) {
    writeJson(KEYS.apiKeys, state, localStorage);
    return;
  }
  writeJson(KEYS.apiKeys, { keys: state.keys }, store);
  writeJson(KEYS.apiKeys, { models: state.models }, localStorage);
}

/** Move existing keys to the other store, then drop the copy left behind. */
export function setRememberKeys(remember: boolean): void {
  const state = read();
  removeJson(KEYS.apiKeys, keyStore());
  useSettingsStore.getState().setRememberKeys(remember);
  write(state);
}

export function getKeys(): Partial<Record<Provider, string>> {
  return read().keys;
}

export function setKey(provider: Provider, key: string): void {
  const state = read();
  const trimmed = key.trim();
  if (trimmed) state.keys[provider] = trimmed;
  else delete state.keys[provider];
  write(state);
}

export function hasAnyKey(): boolean {
  return Object.keys(read().keys).length > 0;
}

export function clearKeys(): void {
  removeJson(KEYS.apiKeys, sessionStorage);
  removeJson(KEYS.apiKeys, localStorage);
}

export function getModel(provider: Provider): string | undefined {
  return read().models[provider];
}

export function setModel(provider: Provider, id: string): void {
  const state = read();
  if (id) state.models[provider] = id;
  else delete state.models[provider];
  write(state);
}
