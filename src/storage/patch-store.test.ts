import { describe, expect, it } from 'vitest';
import type { RackSnapshot } from '../engine/snapshot';
import { MAX_PATCH_BYTES, MAX_TAGS, parsePatchFile, readTags } from './patch-store';

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

describe('readTags', () => {
  it('keeps a short list of short labels', () => {
    expect(readTags(['Techno', '145 BPM', 'F minor'])).toEqual(['Techno', '145 BPM', 'F minor']);
    expect(readTags([' padded '])).toEqual(['padded']);
  });

  it('drops anything that is not a string, rather than trying to repair it', () => {
    // localStorage is editable and an import is untrusted: an object here would be rendered.
    expect(readTags([{}, 42, null, 'Dub'])).toEqual(['Dub']);
    expect(readTags('Techno')).toBeUndefined();
    expect(readTags(undefined)).toBeUndefined();
    expect(readTags([])).toBeUndefined();
    expect(readTags(['', '   '])).toBeUndefined();
  });

  it('bounds the count and the length', () => {
    expect(readTags(Array.from({ length: 20 }, (_, i) => `t${i}`))).toHaveLength(MAX_TAGS);
    expect(readTags(['x'.repeat(33)])).toBeUndefined();
    expect(readTags(['x'.repeat(32)])).toEqual(['x'.repeat(32)]);
  });
});

describe('parsePatchFile tags', () => {
  const file = (tags: unknown): string =>
    JSON.stringify({ format: 'signaly.patch', version: 1, name: 'n', tags, snapshot });

  it('carries valid tags through an import', () => {
    expect(parsePatchFile(file(['Dub', '70 BPM', 'A minor'])).tags).toEqual(['Dub', '70 BPM', 'A minor']);
  });

  it('accepts a patch with no tags at all', () => {
    expect(
      parsePatchFile(
        JSON.stringify({
          format: 'signaly.patch',
          version: 1,
          name: 'n',
          snapshot,
        }),
      ).tags,
    ).toBeUndefined();
  });

  it('strips junk tags instead of rejecting the patch', () => {
    expect(parsePatchFile(file([{ evil: true }, 'Dub'])).tags).toEqual(['Dub']);
    expect(parsePatchFile(file('nope')).tags).toBeUndefined();
  });
});
