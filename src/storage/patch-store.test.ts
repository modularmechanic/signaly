import { describe, expect, it } from 'vitest';
import type { RackSnapshot } from '../engine/snapshot';
import { MAX_PATCH_BYTES, parsePatchFile } from './patch-store';

const snapshot: RackSnapshot = {
  modules: [{ mtype: 'vco', uid: 1, vals: { freq: 220 }, sws: { wave: 0 } }],
  cables: [],
  rows: [[1]],
};

const file = (over: Record<string, unknown> = {}): string =>
  JSON.stringify({ format: 'signaly.patch', version: 1, name: 'Bass', snapshot, ...over });

describe('parsePatchFile', () => {
  it('accepts a well-formed patch file', () => {
    expect(parsePatchFile(file())).toEqual({ name: 'Bass', snapshot });
  });

  it('rejects truncated JSON', () => {
    expect(() => parsePatchFile(file().slice(0, 40))).toThrow(Error);
  });

  it('rejects a foreign format', () => {
    expect(() => parsePatchFile(file({ format: 'other.patch' }))).toThrow(Error);
  });

  it('rejects a future version', () => {
    expect(() => parsePatchFile(file({ version: 2 }))).toThrow(Error);
  });

  it('rejects an invalid rack', () => {
    expect(() => parsePatchFile(file({ snapshot: { modules: 'nope', cables: [], rows: [] } }))).toThrow(
      Error,
    );
  });

  it('rejects a file over the size cap before parsing', () => {
    expect(() => parsePatchFile('x'.repeat(MAX_PATCH_BYTES + 1))).toThrow(/too large/);
  });
});
