import { transform } from 'sucrase';
import preludeSrc from '../../engine/dsp-prelude.ts?raw';
import { MAX_DSP_BYTES } from './schema';

// Defence in depth only. The real sandbox is AudioWorkletGlobalScope — no DOM, no network by
// spec — plus the CSP. This regex is deliberately not sound: globalThis["eval"], aliasing eval
// to a variable, and dynamic import() all get past it, and that is accepted. Since modules can
// be imported, a hostile module file from a third party is a real path; its damage ceiling is
// wedging the user's own tab, which a reload fixes.
const FORBIDDEN =
  /\b(eval|Function|importScripts|fetch|XMLHttpRequest|WebSocket|SharedArrayBuffer|window|document|localStorage|globalThis)\s*[({.]/;

/** The real prelude, transpiled once and flattened into worklet scope — it can never drift. */
const PRELUDE_JS = transform(preludeSrc.replace(/^\/\/\/\s*<reference[^\n]*$/gm, ''), {
  transforms: ['typescript'],
}).code.replace(/^export\s+/gm, '');

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Point an author's `registerProcessor(...)` call at the name the runtime will load. */
export function bindProcessorName(src: string, processorName: string): string {
  return src.replace(/registerProcessor\(\s*(['"])[^'"]*\1/, `registerProcessor('${processorName}'`);
}

export function transpileDsp(
  src: string,
  processorName: string,
): { ok: true; code: string } | { ok: false; error: string } {
  if (typeof src !== 'string' || !src.trim()) return { ok: false, error: 'DSP source is empty' };
  if (src.length > MAX_DSP_BYTES) return { ok: false, error: `DSP source exceeds ${MAX_DSP_BYTES} bytes` };
  const hit = FORBIDDEN.exec(src);
  if (hit) return { ok: false, error: `DSP may not use "${hit[1] ?? 'that global'}" in worklet scope` };
  const call = new RegExp(`registerProcessor\\(\\s*(['"])${escape(processorName)}\\1`);
  if (!call.test(src)) return { ok: false, error: `DSP must call registerProcessor('${processorName}', …)` };
  try {
    const stripped = src.replace(/^\s*import\s[^\n]*$/gm, '');
    const { code } = transform(stripped, { transforms: ['typescript'] });
    return { ok: true, code: `${PRELUDE_JS}\n${code}` };
  } catch (e) {
    return { ok: false, error: `DSP failed to compile: ${e instanceof Error ? e.message : 'unknown error'}` };
  }
}
