import { KEYS, readJson, writeJson } from './local-json';

/** Loose on purpose: phase 07 owns the strict def/dsp schema and narrows `def` there. */
export interface UserModuleRecord {
  slug: string;
  def: unknown;
  dsp: string;
  faceplateImageId?: string;
  createdAt: number;
  updatedAt: number;
}

function isRecord(v: unknown): v is UserModuleRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<UserModuleRecord>;
  return (
    typeof r.slug === 'string' &&
    r.slug.length > 0 &&
    typeof r.dsp === 'string' &&
    typeof r.createdAt === 'number' &&
    typeof r.updatedAt === 'number'
  );
}

const read = (): UserModuleRecord[] => readJson<unknown[]>(KEYS.userModules, []).filter(isRecord);

export function listUserModules(): UserModuleRecord[] {
  return read();
}

export function getUserModule(slug: string): UserModuleRecord | undefined {
  return read().find((r) => r.slug === slug);
}

/** Insert or replace by slug, stamping timestamps. */
export function saveUserModule(
  record: Omit<UserModuleRecord, 'createdAt' | 'updatedAt'> & Partial<UserModuleRecord>,
): UserModuleRecord {
  const list = read();
  const now = Date.now();
  const existing = list.find((r) => r.slug === record.slug);
  const next: UserModuleRecord = {
    slug: record.slug,
    def: record.def,
    dsp: record.dsp,
    faceplateImageId: record.faceplateImageId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  writeJson(KEYS.userModules, [...list.filter((r) => r.slug !== record.slug), next]);
  return next;
}

export function removeUserModule(slug: string): void {
  writeJson(
    KEYS.userModules,
    read().filter((r) => r.slug !== slug),
  );
}
