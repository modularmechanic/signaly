import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../state/settings-store';
import { clearKeys, getKeys, getModel, hasAnyKey, setKey, setModel, setRememberKeys } from './api-key-store';
import { KEYS } from './local-json';

const stored = (store: Storage): { keys?: unknown; models?: unknown } => {
  const raw = store.getItem(KEYS.apiKeys);
  return raw === null ? {} : ((JSON.parse(raw) as { data: object }).data as never);
};

describe('api-key-store', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useSettingsStore.getState().setRememberKeys(false);
    localStorage.clear();
  });

  it('keeps a key out of localStorage by default', () => {
    setKey('openai', 'sk-openai');
    expect(getKeys().openai).toBe('sk-openai');
    expect(hasAnyKey()).toBe(true);
    expect(stored(sessionStorage).keys).toEqual({ openai: 'sk-openai' });
    expect(stored(localStorage).keys).toBeUndefined();
  });

  it('keeps model ids in localStorage even when keys are session-only', () => {
    setModel('gemini', 'gemini-test');
    expect(getModel('gemini')).toBe('gemini-test');
    expect(stored(localStorage).models).toEqual({ gemini: 'gemini-test' });
    expect(sessionStorage.getItem(KEYS.apiKeys)).not.toContain('gemini-test');
  });

  it('moves keys to localStorage when remembering is turned on, and back off again', () => {
    setKey('anthropic', 'sk-ant');
    setRememberKeys(true);
    expect(stored(localStorage).keys).toEqual({ anthropic: 'sk-ant' });
    expect(sessionStorage.getItem(KEYS.apiKeys)).toBeNull();
    expect(getKeys().anthropic).toBe('sk-ant');

    setRememberKeys(false);
    // Never a key left on disk while the checkbox says otherwise.
    expect(stored(localStorage).keys).toBeUndefined();
    expect(stored(sessionStorage).keys).toEqual({ anthropic: 'sk-ant' });
    expect(getKeys().anthropic).toBe('sk-ant');
  });

  it('reads whichever store the setting points at', () => {
    setKey('openai', 'sk-session');
    useSettingsStore.getState().setRememberKeys(true);
    expect(hasAnyKey()).toBe(false);
    useSettingsStore.getState().setRememberKeys(false);
    expect(hasAnyKey()).toBe(true);
  });

  it('leaves a pre-existing localStorage key remembered on first load', async () => {
    // Someone who already had a key chose persistence under the old rules; the new session-only
    // default must not silently orphan it in localStorage with the checkbox off.
    localStorage.setItem(KEYS.apiKeys, JSON.stringify({ v: 1, data: { keys: { openai: 'sk-old' } } }));
    vi.resetModules();
    const settings = await import('../state/settings-store');
    expect(settings.useSettingsStore.getState().rememberKeys).toBe(true);
    const keys = await import('./api-key-store');
    expect(keys.getKeys().openai).toBe('sk-old');
  });

  it('clears keys from both stores', () => {
    setKey('openai', 'sk-session');
    setRememberKeys(true);
    setKey('gemini', 'sk-remembered');
    setRememberKeys(false);
    clearKeys();
    expect(hasAnyKey()).toBe(false);
    expect(localStorage.getItem(KEYS.apiKeys)).toBeNull();
    expect(sessionStorage.getItem(KEYS.apiKeys)).toBeNull();
  });
});
