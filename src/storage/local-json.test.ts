import { beforeEach, describe, expect, it } from 'vitest';
import { KEYS, readJson, removeJson, writeJson } from './local-json';

describe('local-json', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('round-trips through a versioned envelope', () => {
    writeJson(KEYS.settings, { rowWidthHp: 88 });
    expect(readJson(KEYS.settings, { rowWidthHp: 0 })).toEqual({ rowWidthHp: 88 });
    expect(JSON.parse(localStorage.getItem(KEYS.settings) ?? '{}')).toEqual({
      v: 1,
      data: { rowWidthHp: 88 },
    });
  });

  it('falls back for missing, unparseable and wrong-version payloads', () => {
    expect(readJson('missing', 'fb')).toBe('fb');
    localStorage.setItem('bad', '{not json');
    expect(readJson('bad', 'fb')).toBe('fb');
    localStorage.setItem('old', JSON.stringify({ v: 0, data: 'x' }));
    expect(readJson('old', 'fb')).toBe('fb');
    localStorage.setItem('naked', JSON.stringify(['x']));
    expect(readJson('naked', 'fb')).toBe('fb');
  });

  it('falls back when the payload is not the shape the caller expects', () => {
    // a hand-edited or corrupted store must not hand a caller something it cannot .filter()
    localStorage.setItem(KEYS.patches, JSON.stringify({ v: 1, data: null }));
    expect(readJson<unknown[]>(KEYS.patches, [])).toEqual([]);
    localStorage.setItem(KEYS.patches, JSON.stringify({ v: 1, data: { nope: 1 } }));
    expect(readJson<unknown[]>(KEYS.patches, [])).toEqual([]);
    localStorage.setItem(KEYS.settings, JSON.stringify({ v: 1, data: ['x'] }));
    expect(readJson(KEYS.settings, { rowWidthHp: 0 })).toEqual({ rowWidthHp: 0 });
  });

  it('reads, writes and removes in whichever store it is handed', () => {
    // Secrets belong in sessionStorage; everything else keeps the localStorage default.
    writeJson('k', { a: 1 }, sessionStorage);
    expect(localStorage.getItem('k')).toBeNull();
    expect(readJson('k', { a: 0 }, sessionStorage)).toEqual({ a: 1 });
    expect(readJson('k', { a: 0 })).toEqual({ a: 0 });
    removeJson('k', sessionStorage);
    expect(sessionStorage.getItem('k')).toBeNull();
  });

  it('removes a key', () => {
    writeJson('k', 1);
    removeJson('k');
    expect(localStorage.getItem('k')).toBeNull();
  });
});
