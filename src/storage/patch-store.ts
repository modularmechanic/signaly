import { isRackSnapshot, snapshotRack, type PatchFile, type RackSnapshot } from '../engine/snapshot';
import { KEYS, readJson, writeJson } from './local-json';

export const PATCH_FORMAT = 'signaly.patch' as const;
export const PATCH_VERSION = 1 as const;
/** Caller-side cap before JSON.parse — an untrusted file must not blow the main thread. */
export const MAX_PATCH_BYTES = 2_000_000;

/** A label is short and plain: it is rendered as a chip, not a paragraph. */
export const MAX_TAGS = 6;
const MAX_TAG_LEN = 32;

export interface Patch {
  id: string;
  name: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  snapshot: RackSnapshot;
}

/** Untrusted input: anything that is not a short list of short strings is dropped, not repaired. */
export function readTags(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const tags = v
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= MAX_TAG_LEN)
    .slice(0, MAX_TAGS);
  return tags.length ? tags : undefined;
}

const isPatch = (v: unknown): v is Patch => {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Partial<Patch>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.createdAt === 'number' &&
    typeof p.updatedAt === 'number' &&
    (p.tags === undefined || Array.isArray(p.tags)) &&
    isRackSnapshot(p.snapshot)
  );
};

/** Tags are sanitised on the way in AND on the way out: `isPatch` only proves `tags` is an
    array, and localStorage is editable, so a record holding `[{}, 42]` must not reach the UI. */
function sanitise(p: Patch): Patch {
  const tags = readTags(p.tags);
  if (tags) return { ...p, tags };
  const copy = { ...p };
  delete copy.tags;
  return copy;
}

const read = (): Patch[] => readJson<unknown[]>(KEYS.patches, []).filter(isPatch).map(sanitise);
const persist = (list: Patch[]): void => writeJson(KEYS.patches, list);

const normalise = (name: string): string => name.trim().slice(0, 60) || 'Untitled patch';

function uniqueName(name: string, existing: Patch[], skipId?: string): string {
  const taken = new Set(existing.filter((p) => p.id !== skipId).map((p) => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let n = 2; ; n++) {
    const candidate = `${name} ${n}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
}

export function listPatches(): Patch[] {
  return read().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getPatch(id: string): Patch | undefined {
  return read().find((p) => p.id === id);
}

export function savePatch(name: string, snapshot: RackSnapshot = snapshotRack(), tags?: string[]): Patch {
  const list = read();
  const now = Date.now();
  const patch: Patch = {
    id: crypto.randomUUID(),
    name: uniqueName(normalise(name), list),
    ...(readTags(tags) ? { tags: readTags(tags) } : {}),
    createdAt: now,
    updatedAt: now,
    snapshot,
  };
  persist([...list, patch]);
  return patch;
}

export function renamePatch(id: string, name: string): void {
  const list = read();
  const next = normalise(name);
  persist(
    list.map((p) => (p.id === id ? { ...p, name: uniqueName(next, list, id), updatedAt: Date.now() } : p)),
  );
}

export function deletePatch(id: string): void {
  persist(read().filter((p) => p.id !== id));
}

export function serializePatch(patch: Patch): string {
  const file: PatchFile = {
    format: PATCH_FORMAT,
    version: PATCH_VERSION,
    name: patch.name,
    ...(patch.tags?.length ? { tags: patch.tags } : {}),
    snapshot: patch.snapshot,
  };
  return JSON.stringify(file, null, 2);
}

/** Parse an imported patch file. Throws Error with a user-facing message on anything malformed. */
export function parsePatchFile(raw: string): {
  name: string;
  tags?: string[];
  snapshot: RackSnapshot;
} {
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
  return {
    name: normalise(typeof file.name === 'string' ? file.name : ''),
    tags: readTags(file.tags),
    snapshot: file.snapshot,
  };
}

export function downloadPatch(patch: Patch): void {
  const url = URL.createObjectURL(new Blob([serializePatch(patch)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${patch.name.replace(/[^\w.-]+/g, '-')}.signaly.json`;
  a.click();
  // Firefox cancels an in-flight download if the object URL dies in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
