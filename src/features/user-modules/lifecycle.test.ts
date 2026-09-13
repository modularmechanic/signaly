import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSpec, unregisterSpec } from '../../modules/registry';
import { removeImage } from '../../storage/image-store';
import { saveUserModule } from '../../storage/user-module-store';
import { verifyDsp } from './dsp-verify';
import { install, list, remove, restoreAll } from './lifecycle';
import { toRecord, userModuleId, type UserModule } from './schema';

const h = vi.hoisted(() => ({ brokenUrl: '' }));

vi.mock('../../engine/audio-context', () => ({
  getAudioContext: () => ({
    audioWorklet: {
      addModule: (url: string) =>
        url === h.brokenUrl ? Promise.reject(new Error('bad worklet')) : Promise.resolve(),
    },
  }),
}));

vi.mock('../../storage/image-store', () => ({ removeImage: vi.fn(() => Promise.resolve()) }));
vi.mock('./dsp-verify', () => ({ verifyDsp: vi.fn(() => Promise.resolve(null)) }));

const SLUGS = ['lc-one', 'lc-two', 'lc-bad', 'lc-img'];
const IMAGE_ID = '0e4d0f2a-1c3b-4a5d-8e6f-7a8b9c0d1e2f';

const mod = (slug: string): UserModule => ({
  slug,
  def: {
    name: 'FOLD',
    sub: 'TEST',
    hp: 4,
    cat: 'UTILITY',
    knobs: [],
    ins: [],
    outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  },
  dsp: "registerProcessor('x', class P { process() { return true; } })",
  createdAt: 1,
  updatedAt: 1,
});

let blobs = 0;

beforeEach(() => {
  localStorage.clear();
  SLUGS.forEach((s) => unregisterSpec(userModuleId(s)));
  vi.clearAllMocks();
  h.brokenUrl = '';
  blobs = 0;
  // Sequential so a test can name which module's code the live context should refuse.
  URL.createObjectURL = vi.fn(() => `blob:${blobs++}`);
  URL.revokeObjectURL = vi.fn();
});

describe('restoreAll', () => {
  it('registers what it can and names what it could not', async () => {
    saveUserModule(toRecord(mod('lc-one')));
    saveUserModule(toRecord(mod('lc-two')));
    saveUserModule({ ...toRecord(mod('lc-bad')), def: { nope: true } });
    h.brokenUrl = 'blob:0'; // the first stored module's code

    expect((await restoreAll()).sort()).toEqual(['lc-bad', 'lc-one']);
    expect(getSpec(userModuleId('lc-one'))).toBeUndefined();
    expect(getSpec(userModuleId('lc-bad'))).toBeUndefined();
    // A patch names `user:<slug>`, so the spec has to land under that id whatever its worklet is.
    const stored = list().find((r) => r.slug === 'lc-two');
    expect(getSpec(userModuleId('lc-two'))?.def.worklet).toBe(`user:lc-two@${stored?.updatedAt}`);
  });

  it('does not re-verify a module that was verified on the way in', async () => {
    saveUserModule(toRecord(mod('lc-one')));
    expect(await restoreAll()).toEqual([]);
    expect(vi.mocked(verifyDsp)).not.toHaveBeenCalled();
  });
});

describe('remove', () => {
  it('takes the record, the spec and the faceplate image together', async () => {
    saveUserModule(toRecord({ ...mod('lc-img'), faceplateImageId: IMAGE_ID }));
    await restoreAll();
    expect(getSpec(userModuleId('lc-img'))).toBeDefined();

    remove('lc-img');
    expect(list().map((r) => r.slug)).not.toContain('lc-img');
    expect(getSpec(userModuleId('lc-img'))).toBeUndefined();
    expect(vi.mocked(removeImage)).toHaveBeenCalledWith(IMAGE_ID);
  });
});

describe('install', () => {
  it('verifies, registers under the slug id, then persists', async () => {
    expect(await install(mod('lc-one'))).toEqual({ ok: true, id: 'user:lc-one' });
    expect(vi.mocked(verifyDsp)).toHaveBeenCalled();
    expect(list().map((r) => r.slug)).toEqual(['lc-one']);
  });

  it('stores nothing when the runtime refuses the module', async () => {
    h.brokenUrl = 'blob:0';
    const r = await install(mod('lc-one'));
    expect(r.ok).toBe(false);
    expect(list()).toEqual([]);
    expect(getSpec(userModuleId('lc-one'))).toBeUndefined();
  });

  it('stores nothing when the definition does not validate', async () => {
    const r = await install({ ...mod('lc-one'), def: { nope: true } as unknown as UserModule['def'] });
    expect(r.ok).toBe(false);
    expect(list()).toEqual([]);
  });
});
