import { MAX_DSP_BYTES } from '../user-modules/schema';
import { validateSlug } from '../user-modules/validate';

export interface ModuleProposal {
  slug: string;
  def: unknown;
  dsp: string;
  note?: string;
}

const FENCE = /^\s*```[a-z]*\n([\s\S]*?)\n?```\s*$/;

/** Shape-check the provider payload; `def` is validated field-by-field later. */
export function parseProposal(raw: unknown): ModuleProposal | { error: string } {
  let value = raw;
  if (typeof value === 'string') {
    const text = FENCE.exec(value)?.[1] ?? value;
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      return { error: 'the model did not return JSON' };
    }
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { error: 'the model did not return a module object' };
  }
  const o = value as Record<string, unknown>;
  if (!validateSlug(o.slug)) return { error: 'slug must match [a-z0-9-]{3,32}' };
  if (typeof o.def !== 'object' || o.def === null || Array.isArray(o.def)) return { error: 'def is missing' };
  if (typeof o.dsp !== 'string' || !o.dsp.trim()) return { error: 'dsp source is missing' };
  if (o.dsp.length > MAX_DSP_BYTES) return { error: `dsp source exceeds ${MAX_DSP_BYTES} bytes` };
  const note = typeof o.note === 'string' && o.note ? o.note.slice(0, 500) : undefined;
  return { slug: o.slug, def: o.def, dsp: o.dsp, note };
}
