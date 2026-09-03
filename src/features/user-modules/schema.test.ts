import { describe, expect, it } from 'vitest';
import { fromRecord } from './schema';

const rec = (faceplateImageId?: unknown): Parameters<typeof fromRecord>[0] =>
  ({
    slug: 'wobble',
    dsp: 'export default 1;',
    def: {
      name: 'Wobble',
      sub: 'test',
      hp: 6,
      cat: 'FX',
      knobs: [],
      ins: [],
      outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
    },
    createdAt: 1,
    updatedAt: 2,
    faceplateImageId,
  }) as Parameters<typeof fromRecord>[0];

describe('fromRecord faceplateImageId', () => {
  it('keeps a newImageId()-shaped uuid', () => {
    const id = crypto.randomUUID();
    const um = fromRecord(rec(id));
    expect('error' in um ? um.error : um.faceplateImageId).toBe(id);
  });

  it('drops anything that is not that id shape', () => {
    for (const bad of ['../secret', 'faceplate:x', 'x'.repeat(36), 42, null]) {
      const um = fromRecord(rec(bad));
      expect('error' in um ? um.error : um.faceplateImageId).toBeUndefined();
    }
  });
});
