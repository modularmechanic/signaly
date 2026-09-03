import type { ModuleDef } from '../../core/types';
import type { UserModuleRecord } from '../../storage/user-module-store';
import { validateSlug, validateUserDef } from './validate';

/** Runtime owns `id`/`worklet`; user modules are never native. */
export type UserDef = Omit<ModuleDef, 'id' | 'worklet' | 'native'>;

export interface UserModule {
  slug: string;
  def: UserDef;
  dsp: string;
  faceplateImageId?: string;
  createdAt: number;
  updatedAt: number;
}

export const MAX_DSP_BYTES = 64 * 1024;

/** An imported record must not name an arbitrary idb key — only a `newImageId()` UUID. */
const isImageId = (v: unknown): v is string =>
  typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);

export const userModuleId = (slug: string): string => `user:${slug}`;

/** Bumped on every edit: a live AudioContext can never un-register a processor name. */
export const processorNameFor = (um: UserModule): string => `${userModuleId(um.slug)}@${um.updatedAt}`;

export function toRecord(um: UserModule): UserModuleRecord {
  return {
    slug: um.slug,
    def: um.def,
    dsp: um.dsp,
    faceplateImageId: um.faceplateImageId,
    createdAt: um.createdAt,
    updatedAt: um.updatedAt,
  };
}

/** The only door from the loose stored record into the typed module. */
export function fromRecord(rec: UserModuleRecord): UserModule | { error: string } {
  if (!validateSlug(rec.slug)) return { error: 'slug must match [a-z0-9-]{3,32}' };
  if (typeof rec.dsp !== 'string' || !rec.dsp.trim()) return { error: 'dsp source is empty' };
  if (rec.dsp.length > MAX_DSP_BYTES) return { error: `dsp source exceeds ${MAX_DSP_BYTES} bytes` };
  const v = validateUserDef(rec.def);
  if (!v.ok) return { error: v.error };
  return {
    slug: rec.slug,
    def: v.def,
    dsp: rec.dsp,
    faceplateImageId: isImageId(rec.faceplateImageId) ? rec.faceplateImageId : undefined,
    createdAt: Number.isFinite(rec.createdAt) ? rec.createdAt : Date.now(),
    updatedAt: Number.isFinite(rec.updatedAt) ? rec.updatedAt : Date.now(),
  };
}
