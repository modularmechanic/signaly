import { isRackSnapshot, snapshotRack, type PatchFile, type RackSnapshot } from '../engine/snapshot';
import { KEYS, readJson, writeJson } from './local-json';

export const PATCH_FORMAT = 'signaly.patch' as const;
export const PATCH_VERSION = 1 as const;
/** Caller-side cap before JSON.parse — an untrusted file must not blow the main thread. */
export const MAX_PATCH_BYTES = 2_000_000;

export interface Preset {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: RackSnapshot;
}

const isPreset = (v: unknown): v is Preset => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Partial<Preset>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number' &&
    isRackSnapshot(p.snapshot)
  );
};

const read = (): Preset[] => readJson<unknown[]>(KEYS.patches, []).filter(isPreset);
const persist = (list: Preset[]): void => writeJson(KEYS.patches, list);

const normalise = (name: string): string => name.trim().slice(0, 60) || 'Untitled patch';

function uniqueName(name: string, existing: Preset[], skipId?: string): string {
  const taken = new Set(existing.filter((p) => p.id !== skipId).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export function listPresets(): Preset[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getPreset(id: string): Preset | undefined {
  return read().find((p) => p.id === id);
}

export function savePreset(name: string, snapshot: RackSnapshot = snapshotRack()): Preset {
  const list = read();
  const now = Date.now();
  const preset: Preset = {
    id: crypto.randomUUID(),
    name: uniqueName(normalise(name), list),
    createdAt: now,
    updatedAt: now,
    snapshot,
  };
  persist([...list, preset]);
  return preset;
}

export function renamePreset(id: string, name: string): void {
  const list = read();
  const next = normalise(name);
  persist(
    list.map((p) => (p.id === id ? { ...p, name: uniqueName(next, list, id), updatedAt: Date.now() } : p)),
  );
}

export function deletePreset(id: string): void {
  persist(read().filter((p) => p.id !== id));
}

export function serializePreset(preset: Preset): string {
  const file: PatchFile = {
    format: PATCH_FORMAT,
    version: PATCH_VERSION,
    name: preset.name,
    snapshot: preset.snapshot,
  };
  return JSON.stringify(file, null, 2);
}

/** Parse an imported patch file. Throws Error with a user-facing message on anything malformed. */
export function parsePatchFile(raw: string): { name: string; snapshot: RackSnapshot } {
  if (raw.length > MAX_PATCH_BYTES) throw new Error('Patch file is too large.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('Patch file is not valid JSON.');
  }
  if (typeof parsed !== 'object' || parsed === null) throw new Error('Patch file is not a patch.');
  const file = parsed as Partial<PatchFile>;
  if (file.format !== PATCH_FORMAT || file.version !== PATCH_VERSION)
    throw new Error('Unsupported patch format.');
  if (!isRackSnapshot(file.snapshot)) throw new Error('Patch file contains an invalid rack.');
  return { name: normalise(typeof file.name === 'string' ? file.name : ''), snapshot: file.snapshot };
}

export function downloadPreset(preset: Preset): void {
  const url = URL.createObjectURL(new Blob([serializePreset(preset)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${preset.name.replace(/[^\w.-]+/g, '-')}.signaly.json`;
  a.click();
  URL.revokeObjectURL(url);
}
