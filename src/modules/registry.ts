import type { ModuleDef } from '../core/types';
import type { ModuleSpec, NativeSpec, SerializeSpec } from '../engine/types';

// Patterns must stay literal — Vite resolves them at transform time.
const defMods = import.meta.glob<{ def: ModuleDef }>('./*/*.def.ts', { eager: true });
const nativeMods = import.meta.glob<{ native: NativeSpec }>('./*/*.native.ts', { eager: true });
const serializeMods = import.meta.glob<{ serialize: SerializeSpec }>('./*/*.serialize.ts', { eager: true });
const partsMods = import.meta.glob<{ parts: ModuleSpec['parts'] }>('./*/*.parts.tsx', { eager: true });

/** './vco/vco.def.ts' -> 'vco' */
function bySlug<T>(mods: Record<string, T>): Map<string, T> {
  const out = new Map<string, T>();
  for (const [path, mod] of Object.entries(mods)) {
    const slug = path.split('/')[1];
    if (slug) out.set(slug, mod);
  }
  return out;
}

const specs = new Map<string, ModuleSpec>();

{
  const natives = bySlug(nativeMods);
  const serializers = bySlug(serializeMods);
  const parts = bySlug(partsMods);
  for (const [slug, mod] of bySlug(defMods)) {
    specs.set(mod.def.id, {
      def: mod.def,
      native: natives.get(slug)?.native,
      serialize: serializers.get(slug)?.serialize,
      parts: parts.get(slug)?.parts,
    });
  }
}

export function getSpec(id: string): ModuleSpec | undefined {
  return specs.get(id);
}

export function allSpecs(): ModuleSpec[] {
  return [...specs.values()];
}

/** Runtime registration for user-authored modules (phase 07). */
export function registerSpec(spec: ModuleSpec): void {
  specs.set(spec.def.id, spec);
}

export function unregisterSpec(id: string): void {
  specs.delete(id);
}
