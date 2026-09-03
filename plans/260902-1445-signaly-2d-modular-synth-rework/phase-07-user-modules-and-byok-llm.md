# Phase 07 — User-module core + BYOK LLM

## Context links
- Plan: [plan.md](plan.md) · Foundation: [phase-01](phase-01-foundation-engine-state-storage.md)
- Reports: [researcher-01](research/researcher-01-byok-llm-and-dsp-transpile-report.md) (whole file) · [researcher-02](research/researcher-02-2d-eurorack-ui-accessibility-storage-report.md) §4 · [scout-00](scout/scout-00-main-agent-source-analysis.md) §"Module contract"
- Source (reference only, do **not** port): `cablewerk-v2/src/module-lab/` (19.9K LOC — read `runtime/compiler.ts` and `generation.ts` for ideas, copy nothing)

## Parallelization Info
- **Group:** 2
- **Runs with:** 02, 03, 04, 05
- **Waits for:** 01 (needs `core/types.ts`, `engine/{types,dsp-prelude,audio-context}.ts`, `modules/registry.ts` `registerSpec`/`unregisterSpec`, `storage/{local-json,image-store,api-key-store}.ts`)

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- Headless core for user-authored modules: validate a JSON def, transpile TS DSP, verify it renders finite audio, register it at runtime, and generate both the def and the faceplate image from an LLM using the user's own key. Zero UI — phase 08 is the face on top of this.

## Key Insights
- All three providers are callable **directly from the browser**. Anthropic needs `anthropic-dangerous-direct-browser-access: true`; OpenAI uses standard Bearer; Gemini takes the key as a query param. No proxy (researcher-01 §1).
- Forced JSON differs per provider: Anthropic has **no** `response_format` — use tool-use with `tool_choice:{type:'tool',name:…}`. OpenAI uses `response_format: {type:'json_schema', strict:true}`. Gemini uses `responseSchema` in an **OpenAPI-3.0 subset** (flatten — no `$ref`/`oneOf`) (researcher-01 §1).
- **Skip streaming.** Module generation is one-shot; SSE is three parsers for a typing effect nobody asked for (researcher-01 §1).
- **sucrase**, not esbuild-wasm/swc/typescript: pure JS, synchronous, no WASM fetch+init step, and we never want type-checking here — LLM output is regenerate-on-error (researcher-01 §3).
- Image gen: OpenAI `gpt-image-1` always returns `b64_json`; Gemini emits images through the *same* `generateContent` endpoint via `inlineData`. **Anthropic has no image generation** — disable the button with a hint, do not error (researcher-01 §2).
- **Never hardcode model IDs** — they churn. Fetch each provider's model list at key-entry time and default to the newest (researcher-01 unresolved Q1).
- Faceplate images go to IndexedDB as `Blob` via `idb-keyval`; localStorage is 5 MB, synchronous, JSON only (researcher-02 §4).

## Requirements
<!-- Updated: Validation Session 1 - optional panel -->
- **Optional `panel` in the user-module record**: `def.panel?: PanelLayout` (same shape as built-ins). `validate.ts` checks, when present: every node id resolves to a def control/jack (`knob:<id>`, `switch:<id>`, `input:<id>`, `output:<id>`, or `display`), all `x/y/w/h` are finite and within 0..1, and `x+w`/`y+h` ≤ 1. When absent, `layoutPanel` computes the grid. The system prompt in `module-builder-prompt.ts` describes `panel` as optional and tells the model to include it only when the user asks to align controls with a faceplate image; the proposal JSON schema lists it as optional.
- A user module is registered under the namespaced id `user:<slug>` and its worklet processor name is the identical string. Slug is `[a-z0-9-]{3,32}`.
- Nothing reaches `audioWorklet.addModule` without passing, in order: forbidden-global scan → import strip → transpile → offline finite-render verification.
- LLM JSON is untrusted. `validate.ts` checks every field of the proposed def against `core/types.ts` before anything is registered.
- The chat feature is unavailable unless `api-key-store.hasAnyKey()` — phase 08 reads this; this phase exposes it.
- No API key ever appears in a log line, an error message, or a thrown object.

## Architecture

User-module record (`features/user-modules/schema.ts`):
```ts
export interface UserModule {
  slug: string;                                        // [a-z0-9-]{3,32}
  def: Omit<ModuleDef, 'id' | 'worklet' | 'native'>;   // runtime sets id & worklet = `user:${slug}`
  dsp: string;                                         // TS source
  faceplateImageId?: string;                           // idb-keyval key
  createdAt: number; updatedAt: number;
}
```
Stored as `Envelope<UserModule[]>` under `signaly.user-modules.v1` (phase-01 `local-json`). `dsp` is a string, so a 5 MB localStorage budget holds hundreds of modules; images never go here.

DSP contract handed to the LLM (and to any human author) — deliberately one class, no imports:
```ts
class P extends Base {
  defaults() { return { freq: 440, amt: 0.5 }; }        // knob ids -> initial values
  process(I, O) {                                        // I/O ordered as def.ins / def.outs
    const out = O[0][0], n = out.length;                 // read .length, never assume 128
    for (let i = 0; i < n; i++) out[i] = /* volts: audio ±5, gate 0/5, pitch 1V/oct */ 0;
    return true;
  }
}
registerProcessor('user:my-slug', P);
```
Available prelude symbols (nothing else exists in worklet scope): `Base`, `ch`, `clamp`, `TP`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `ClockSync`, `SYNC_DIV`, `sampleRate`.

Transpile pipeline (`features/user-modules/dsp-transpile.ts`):
```ts
const FORBIDDEN = /\b(eval|Function|importScripts|fetch|XMLHttpRequest|WebSocket|SharedArrayBuffer|window|document|localStorage|globalThis)\s*[({.]/;
export function transpileDsp(src: string, processorName: string):
  { ok: true; code: string } | { ok: false; error: string } {
  // 1. FORBIDDEN scan -> fail fast with a readable message
  // 2. assert the source contains registerProcessor('<processorName>', …)
  // 3. src.replace(/^\s*import\s.+$/gm, '')      // no imports allowed in worklet scope
  // 4. sucrase transform(src, { transforms: ['typescript'] }).code
  // 5. return PRELUDE_JS + '\n' + transformed
}
```
`PRELUDE_JS` is the phase-01 prelude pre-transpiled to JS and inlined as a string constant — generated at build time by a tiny `sucrase` call at module init over a `?raw` import of `engine/dsp-prelude.ts`, so it can never drift from the real prelude.

Verify pipeline (`features/user-modules/dsp-verify.ts`):
```ts
export async function verifyDsp(code: string, processorName: string, outs: number): Promise<string | null>
// OfflineAudioContext(outs, 8192, 44100) -> Blob -> URL.createObjectURL -> addModule
// -> new AudioWorkletNode -> connect -> startRendering(), raced against a 3s timeout
// -> every sample finite and |x| <= 100, else return a message; null means OK
// -> URL.revokeObjectURL in a finally
```
Runtime registration (`features/user-modules/runtime-registry.ts`): transpile → verify → `audioWorklet.addModule(blobUrl)` on the **live** context → `registry.registerSpec({ def: {...um.def, id, worklet: id} })`. `unregister(slug)` calls `registry.unregisterSpec(id)` — the worklet processor name cannot be un-registered from a live context, so editing a module bumps the name to `user:<slug>@<updatedAt>` and the def follows.

LLM client (`features/llm/client.ts`) — one interface, three thin providers:
```ts
export type ProviderId = 'anthropic' | 'openai' | 'gemini';
export interface Provider {
  chatJson(key: string, model: string, system: string, user: string, schema: object): Promise<unknown>;
  listModels(key: string): Promise<string[]>;
  image?(key: string, model: string, prompt: string): Promise<Blob>;   // absent on anthropic
}
```
Request shapes are exactly as researcher-01 §1–2 documents them; the only per-provider divergence is JSON forcing and where the key goes.

Proposal parsing (`features/llm/module-proposal.ts`):
```ts
export interface ModuleProposal { slug: string; def: unknown; dsp: string; note?: string }
export function parseProposal(raw: unknown): ModuleProposal | { error: string }
// then features/user-modules/validate.ts validates `def` field-by-field against core/types.ts
```

Faceplate crop (`features/faceplate/image-crop.ts`), no library (researcher-02 §4):
```ts
export async function cropToFaceplate(
  src: Blob, crop: { sx: number; sy: number; sw: number; sh: number },
  out: { w: number; h: number },
): Promise<Blob>   // createImageBitmap -> OffscreenCanvas(out.w*2, out.h*2) -> drawImage 9-arg -> convertToBlob webp q0.85
```

## Related code files
**Create:**
- `src/features/user-modules/{schema,validate,dsp-transpile,dsp-verify,runtime-registry}.ts`
- `src/features/user-modules/{validate,dsp-transpile,dsp-verify}.test.ts`
- `src/features/llm/{client,module-builder-prompt,module-proposal,faceplate-image}.ts`
- `src/features/llm/providers/{anthropic,openai,gemini}.ts`
- `src/features/llm/{module-proposal,providers/anthropic}.test.ts`
- `src/features/faceplate/image-crop.ts` + `image-crop.test.ts`

**Modify:** none. **Delete:** none.
**Read for ideas only (copy nothing):** `cablewerk-v2/src/module-lab/runtime/compiler.ts`, `custom-module-registry.ts`, `generation.ts`.

## File Ownership
Exclusively owns everything under `src/features/user-modules/`, `src/features/llm/`, `src/features/faceplate/`. Touches no file outside `src/features/`. Consumes but does not edit phase-01's `storage/api-key-store.ts`, `storage/image-store.ts`, `storage/user-module-store.ts`, and `modules/registry.ts`.

## Implementation Steps
1. `schema.ts` + `validate.ts`. Validate exhaustively: slug regex, `cat` in `CAT_ORDER`, `hp` 1–24, ≤16 knobs, ≤8 switches, ≤8 ins, ≤8 outs, every `knob.def` within `[min,max]`, every `cvIn`/`attenuates` naming a real `c` input, all jack ids unique, `display` in the six-value union. Reject on the first failure with a message the chat can show.
2. `dsp-transpile.ts` with the forbidden scan, import strip, and inlined prelude. Import the prelude source with `?raw` and sucrase it once at module init so `PRELUDE_JS` cannot drift.
3. `dsp-verify.ts` with the `OfflineAudioContext` render, the 3 s timeout race, the finite/range check, and `revokeObjectURL` in a `finally`.
4. `runtime-registry.ts`: `registerUserModule(um)` / `unregisterUserModule(slug)`, with the `user:<slug>@<updatedAt>` processor-name bump on edit.
5. `providers/*.ts` — three files, one exported `Provider` each, per researcher-01's exact request shapes. `listModels` hits `GET /v1/models` (Anthropic, OpenAI) and `GET /v1beta/models?key=` (Gemini). Never hardcode a model id.
6. `client.ts` picks the provider from whichever key is present (user choice when several), and normalises errors into `{ error: string }` with the key scrubbed.
7. `module-builder-prompt.ts` — the system prompt, built from a skeleton rather than a prose blob:
   ```
   You author modules for a browser modular synth. Return ONLY the tool/JSON payload.
   DEF: <the ModuleDef JSON shape, field by field, with the Cat and Display unions enumerated>
   DSP: one `class P extends Base` with defaults() and process(I,O), then registerProcessor('user:<slug>', P).
   AVAILABLE SYMBOLS (nothing else exists): Base ch clamp TP flush blep oscW DL OnePole onePoleCoeff ClockSync SYNC_DIV sampleRate
   FORBIDDEN: import, fetch, eval, Function, window, document, any DOM or network API.
   SIGNALS: volts — audio ±5, gate 0/5, pitch 1V/oct with 0V = C4.
   BUFFERS: read O[0][0].length; allocate nothing inside process().
   ```
   Export the matching JSON schema object once and feed it to all three providers (flattened for Gemini's OpenAPI subset).
8. `module-proposal.ts` — parse and shape-check the provider payload before `validate.ts` sees it.
9. `faceplate-image.ts` — OpenAI `images/generations` → `b64_json` → `Blob`; Gemini `generateContent` → `inlineData` → `Blob`; Anthropic → `{ unsupported: true }`, never an exception.
10. `image-crop.ts` per the signature above.
11. Tests: `validate.test.ts` (one passing def + eight rejection cases); `dsp-transpile.test.ts` (strips imports, rejects each forbidden global, emits valid JS for a known class, rejects a mismatched processor name); `dsp-verify.test.ts` (a NaN-emitting processor is rejected — mock `OfflineAudioContext` under jsdom); `module-proposal.test.ts` (parses each provider's response envelope, rejects three malformed ones); `providers/anthropic.test.ts` (asserts the browser-access header and `tool_choice` are present, with `fetch` mocked); `image-crop.test.ts` (crop maths — the 9-arg `drawImage` call receives the expected source rect).

## Todo list
- [ ] `schema.ts` + exhaustive `validate.ts` + test
- [ ] `dsp-transpile.ts` (scan, strip, sucrase, inlined prelude) + test
- [ ] `dsp-verify.ts` (offline render, timeout, finite check) + test
- [ ] `runtime-registry.ts` with processor-name bump on edit
- [ ] Three providers + `client.ts` + runtime model listing
- [ ] `module-builder-prompt.ts` + shared JSON schema (Gemini-flattened)
- [ ] `module-proposal.ts` + test
- [ ] `faceplate-image.ts` (OpenAI, Gemini; Anthropic unsupported)
- [ ] `image-crop.ts` + test

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run` pass.
- A hand-written valid `UserModule` fixture round-trips: validate → transpile → verify → register → appears in `registry.allSpecs()`.
- A NaN-emitting DSP is rejected by `verifyDsp` with a message, and never reaches `addModule` on the live context.
- Every forbidden global is individually rejected by a test case.
- Grepping the phase's files for a key variable finds it in no template literal, `console.*` call, or `Error` message.
- No model id string is hardcoded anywhere.

## Conflict Prevention
Sole owner of `src/features/`. Runs beside 02/03/04 (module folders) and 05 (`src/ui/`) with zero file overlap. Registers modules through phase-01's `registerSpec` — it must not edit `registry.ts`. Phase 08 consumes this API and starts only after this phase lands.

## Risk Assessment
- **Prelude drift** (high): if `PRELUDE_JS` is a hand-copied string it will silently diverge from `engine/dsp-prelude.ts` and user DSP will break in ways the built-ins do not. The `?raw` + sucrase-at-init approach removes the failure mode entirely — do not shortcut it.
- **Infinite loop in `process()`** (high): a bad `while` hangs the audio thread. The 3 s `addModule`+render timeout catches it during verification; it cannot be caught after registration, so verification is not optional.
- **Live-context processor names are permanent** (medium): `registerProcessor` cannot be undone in a running `AudioContext`. The `@<updatedAt>` suffix is the workaround; without it, editing a module silently keeps the old DSP.
- **Provider drift** (medium): model ids, and possibly the Anthropic browser-access header, change. Runtime `listModels` plus a normalised error path keeps a change from bricking the feature.
- **OpenAI image CORS unverified** (low): researcher-01 inferred rather than confirmed that `images/generations` is browser-callable. Verify with one live call; Gemini image gen is the documented fallback.

## Security Considerations
- **API keys**: `localStorage` (or `sessionStorage` if the user prefers a smaller blast radius — expose it as a setting). Any XSS reads them, so the CSP in phase 01's `index.html` is the real mitigation: `script-src 'self' blob:` (`blob:` is required for `addModule`), no `unsafe-inline`, no third-party script origins ever. Keys must be scrubbed from every error path.
- **DSP sandbox**: `AudioWorkletGlobalScope` has no DOM and no network by spec, so the forbidden-global scan is defence-in-depth and fast, readable failure — not the primary boundary. The real boundaries are the offline verification and the fact that nothing user-supplied is ever `eval`'d on the main thread.
- **Untrusted JSON**: LLM output and imported module files are both untrusted. `validate.ts` runs before registration, bounds every array, and rejects rather than coercing. A hostile `label`/`name` must be rendered as a text node by phase 08 — never `dangerouslySetInnerHTML`, never string-concatenated into a `style` attribute.
- **Blob URLs**: revoke every `createObjectURL` in a `finally`; a leaked blob URL keeps the code alive for the page's lifetime.

## Next steps
Unblocks phase 08.
