import { getAudioContext } from '../../engine/audio-context';
import { forgetPanel } from '../../modules/panel-layout';
import { registerSpec, unregisterSpec } from '../../modules/registry';
import { removeImage } from '../../storage/image-store';
import {
  getUserModule,
  listUserModules,
  removeUserModule,
  saveUserModule,
  type UserModuleRecord,
} from '../../storage/user-module-store';
import { bindProcessorName, transpileDsp } from './dsp-transpile';
import { verifyDsp } from './dsp-verify';
import { fromRecord, processorNameFor, toRecord, userModuleId, type UserModule } from './schema';

export type Result = { ok: true; id: string } | { ok: false; error: string };

/** Validation is step one of every way in, and the stored record shape is the only door.
    `saved` relaxes the rules added since a module was written — see checkDef. */
const parse = (um: UserModule, saved = false): UserModule | { error: string } =>
  fromRecord(toRecord(um), saved);

const fail = (error: string): Result => ({ ok: false, error });

function build(um: UserModule): { ok: true; code: string; name: string } | { ok: false; error: string } {
  const name = processorNameFor(um);
  const built = transpileDsp(bindProcessorName(um.dsp, name), name);
  return built.ok ? { ok: true, code: built.code, name } : built;
}

/** Transpile, optionally verify offline, then load into the live context and register the spec.
    A restore skips the verify: a stored module already passed on the way in, and verification
    catches authoring mistakes — the worklet scope plus the CSP are the security boundary. */
async function bring(um: UserModule, verify: boolean): Promise<Result> {
  const built = build(um);
  if (!built.ok) return built;
  if (verify) {
    const failure = await verifyDsp(built.code, built.name, um.def);
    if (failure) return fail(failure);
  }
  const url = URL.createObjectURL(new Blob([built.code], { type: 'application/javascript' }));
  try {
    await getAudioContext().audioWorklet.addModule(url);
  } catch (e) {
    return fail(`worklet load failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  } finally {
    URL.revokeObjectURL(url);
  }
  const id = userModuleId(um.slug);
  // The author's `cat` is kept as-is; the browser lists user modules under it.
  registerSpec({ def: { ...um.def, id, worklet: built.name }, faceplate: um.faceplateImageId });
  forgetPanel(id);
  return { ok: true, id };
}

/** Would this module install? Renders the DSP offline and answers with a message or null. */
export async function check(um: UserModule): Promise<string | null> {
  const v = parse(um);
  if ('error' in v) return v.error;
  const built = build(v);
  if (!built.ok) return built.error;
  return verifyDsp(built.code, built.name, v.def);
}

/** Load and register a draft without storing it — what the builder previews. Lenient, so a
    module saved or exported under older rules still opens; it meets them all when installed.
    The chat already holds a model's proposal to the full rules before it ever gets here. */
export async function activate(um: UserModule): Promise<Result> {
  const v = parse(um, true);
  return 'error' in v ? fail(v.error) : bring(v, true);
}

/** The whole life in one call: validate, transpile, verify, load, register, then persist. */
export async function install(um: UserModule): Promise<Result> {
  // updatedAt drives the processor name, and a live context can never un-register an old one,
  // so every install mints a fresh one before anything is registered under it.
  const v = parse({ ...um, updatedAt: Date.now() });
  if ('error' in v) return fail(v.error);
  const r = await bring(v, true);
  // Storage comes last: nothing is stored that the runtime refused.
  if (r.ok) saveUserModule(toRecord(v));
  return r;
}

/** Storage, registry and faceplate image go together — miss one and a ghost outlives the module. */
export function remove(slug: string): void {
  const id = userModuleId(slug);
  const imageId = getUserModule(slug)?.faceplateImageId;
  removeUserModule(slug);
  unregisterSpec(id);
  forgetPanel(id);
  // Fire and forget: a failed idb delete orphans one blob, it must not keep the module listed.
  if (imageId) void removeImage(imageId);
}

export function list(): UserModuleRecord[] {
  return listUserModules();
}

/** Boot path: put every stored module back in the registry, so the browser lists it and a patch
    naming `user:<slug>` still finds a spec. Returns the slugs that did not come back — one
    broken module never keeps the rest out. */
export async function restoreAll(): Promise<string[]> {
  const failed: string[] = [];
  for (const rec of listUserModules()) {
    const um = fromRecord(rec, true);
    if ('error' in um) {
      failed.push(rec.slug);
      continue;
    }
    const r = await bring(um, false);
    if (!r.ok) failed.push(rec.slug);
  }
  return failed;
}
