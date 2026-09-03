# Research: BYOK LLM calls, image gen, in-browser TS transpile, key security

## Summary
- All 3 chat providers (Anthropic, OpenAI, Gemini) are directly callable from a browser with a user-supplied key; Anthropic needs one extra header, Gemini needs no special header (key as query param), OpenAI uses standard Bearer auth. No proxy needed for any of them.
- Forced JSON: Anthropic has no `response_format` — use tool-use with `tool_choice:{type:"tool",name:...}`. OpenAI and Gemini both have native schema-constrained JSON (`json_schema` / `responseSchema`).
- Non-streaming is the KISS call for this app: module-gen and faceplate-gen are one-shot, latency of a few seconds is fine, and SSE parsing is real code (chunk buffering, `data:` line split, `[DONE]` sentinel) for zero UX gain here. Skip streaming.
- Image gen: OpenAI `gpt-image-1` returns `b64_json` only (paste straight into `<img src="data:image/png;base64,...">`). Gemini can also emit images via `gemini-*-image` models through the *same* `generateContent` endpoint (inline base64 in response parts) — no separate Vertex/Imagen auth needed. Anthropic has no image generation.
- For TS→JS in-worklet: **sucrase** is the lazy-correct pick (pure JS, sync, no WASM fetch/init step, tiny vs. shipping `typescript`). esbuild-wasm/@swc/wasm-web are fast but add an async WASM-load step (~1-3MB fetch + init latency) for a job (strip types off one small class) that doesn't need real type-checking anyway.

## 1. Chat APIs — browser-direct calls

### Anthropic Messages API
`POST https://api.anthropic.com/v1/messages`
Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`, **`anthropic-dangerous-direct-browser-access: true`** (required for CORS — undocumented-turned-supported opt-in). [Simon Willison](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/), [GitHub issue](https://github.com/ianarawjo/ChainForge/issues/367)

Forced JSON = tool-use trick (Claude has no native JSON mode):
```js
fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
    "content-type": "application/json",
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-5",              // verify current id, see note below
    max_tokens: 4096,
    tools: [{ name: "emit_module", input_schema: moduleJsonSchema }],
    tool_choice: { type: "tool", name: "emit_module" },
    messages: [{ role: "user", content: prompt }],
  }),
});
// result.content[0].input  <- the JSON object matching moduleJsonSchema
```
Model IDs churn fast (my own model string is `claude-sonnet-5`, i.e. the family has already moved past 4.x as of Sept 2026) — **don't hardcode; call `GET /v1/models` with the user's key at app boot and let them pick / auto-pick the newest `claude-*` id.** Same recommendation applies to OpenAI/Gemini below.

### OpenAI (Chat Completions / Responses)
`POST https://api.openai.com/v1/chat/completions` or newer `POST https://api.openai.com/v1/responses`. Auth: `Authorization: Bearer <key>`. CORS: works directly from the browser — this is exactly what the `dangerouslyAllowBrowser: true` flag in the `openai` npm SDK exists to permit (SDK just adds a guard, the API itself doesn't block browser origins). [community/docs refs]
```js
fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "gpt-5.1-mini",   // verify via GET /v1/models
    messages: [{ role: "user", content: prompt }],
    response_format: {
      type: "json_schema",
      json_schema: { name: "module", schema: moduleJsonSchema, strict: true },
    },
  }),
});
// result.choices[0].message.content  <- JSON string, JSON.parse it
```
Responses API equivalent nests it as `text: { format: { type: "json_schema", name, schema, strict: true } }` and reads `result.output_text`. Either works; Chat Completions is the smaller mental model for a KISS client. [OpenAI docs](https://developers.openai.com/api/docs/guides/structured-outputs)

### Google Gemini
`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=<KEY>` — key goes in the **query string**, no custom header, CORS-friendly (this is the pattern Google AI Studio's own web playground uses).
```js
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: moduleJsonSchema, // OpenAPI-subset schema, not full JSON Schema
    },
  }),
});
// result.candidates[0].content.parts[0].text  <- JSON string
```
Note: `responseSchema` uses an OpenAPI 3.0 subset (no `$ref`/`oneOf` in older versions) — flatten the schema. [Firebase AI Logic docs](https://firebase.google.com/docs/ai-logic/generate-structured-output)

**Streaming**: all three support SSE (`stream:true` for Anthropic/OpenAI, `:streamGenerateContent?alt=sse` for Gemini). Recommend **skip it** — one-shot module-gen doesn't need token-by-token UX, and SSE adds a parser per provider (3x the code) for a "typing effect" nobody asked for. Add later only if users complain about perceived latency on long generations.

## 2. Image generation

**OpenAI** `POST https://api.openai.com/v1/images/generations`, same Bearer auth as chat.
```js
{ model: "gpt-image-1", prompt, size: "1024x1024" } // or "1536x1024" / "1024x1536" / "auto"
// -> result.data[0].b64_json   (gpt-image-1 ALWAYS returns b64_json, response_format param is ignored for this model)
```
[OpenAI image docs](https://developers.openai.com/api/docs/guides/image-generation)

**Gemini** — no separate image endpoint needed. Use an image-capable model (`gemini-2.5-flash-image` / newer `gemini-*-image` variants, aka "nano-banana") through the **same** `generateContent` call as text, just without `responseSchema`:
```js
// result.candidates[0].content.parts[] contains an entry with .inlineData = {mimeType, data: base64}
```
True Imagen (`imagen-*` models via `:predict`) lives on Vertex AI and needs GCP OAuth/service-account auth — **not viable for a pure client-side BYOK key**, skip it.

**Anthropic**: no image generation capability, confirmed — Claude is text/vision-in, text-out only.

**Recommendation**: don't require a separate image-gen provider. If the user's active chat key is OpenAI → `gpt-image-1`. If Gemini → `gemini-*-image` via the same endpoint they already call for text. If the user is Anthropic-only, faceplate image gen is simply unavailable until they add an OpenAI or Gemini key (surface that as a disabled button + tooltip, not an error).

## 3. In-browser TS→JS transpile for worklet blob

| Option | Mechanism | Payload to ship | Init | Type-check |
|---|---|---|---|---|
| **sucrase** | pure-JS regex/light-parse transform | small, no WASM, tree-shakeable (import only `transform` + `typescript`/`jsx` plugins) | sync, instant | none |
| esbuild-wasm | WASM binary + JS glue | ~2-3MB wasm fetch (gzipped) | async `initialize()`, one-time ~100-500ms | none |
| @swc/wasm-web | WASM binary + JS glue | similar ballpark to esbuild-wasm | async init | none |
| ship `typescript` | full TS compiler in JS | ~3-4MB, more if using real `Program`/checker w/ lib.d.ts | sync but heavy parse | optional, expensive if enabled |

None of the browser tools we'll ever want type-checking for this feature (LLM output is regenerate-on-error, not compile-time-safe) — **sucrase wins on the ladder**: no WASM fetch/init step, smallest realistic bundle, synchronous call fits a plain `fetch`-based app with no build-step exotica. `esbuild-wasm`/`swc` only pay off if you also need bundling (we don't — one file, no imports allowed in worklet code) or need to touch untyped-import-elision edge cases sucrase doesn't handle. [comparison refs found generic, sizes are Sucrase/esbuild's own package docs — not independently verified for identical CLI-flag configs, flag as best-effort]

**Strip imports / prelude**: DSP code shouldn't have external imports at all (worklet sandbox rule: no imports). Regex-strip any `^import .* from .*;?$` line before transform (or just reject generation if the LLM emits one — cheaper and safer than trying to resolve/strip nested imports). Prepend the `Base` class prelude and `registerProcessor` boilerplate as a string, concat with the sucrase-transformed class body, `new Blob([code], {type:'application/javascript'})`, `URL.createObjectURL`, `audioWorklet.addModule(blobUrl)`.

**Sandbox / forbidden-globals check** (static regex/token scan before blobbing): reject `eval(`, `Function(`, `importScripts(`, `fetch(`, `XMLHttpRequest`, `WebSocket`, `SharedArrayBuffer`, `window`, `document`, `localStorage` (most already throw ReferenceError inside AudioWorkletGlobalScope by spec — no DOM/network there — but scan anyway as defense-in-depth and to fail fast with a clear message instead of a runtime worklet crash).

**Finite-output verification pass**: before wiring the new processor into the live graph, render it standalone for ~1s in a throwaway `OfflineAudioContext`, check the output buffer for `NaN`/`Infinity`/values outside a sane range (e.g. |x|>100) — reject and re-prompt the LLM with the error if it fails. Also wrap the `addModule` + first-render step in a timeout (e.g. 3s) to catch an infinite loop in `process()`.

## 4. localStorage API key exposure

Any XSS = full read of `localStorage`, key exfiltrated. No backend exists to move the key server-side, so mitigations are all client-side hardening, not elimination:
- Strict CSP: `script-src 'self' blob:` (blob: needed for `audioWorklet.addModule`) + no third-party script origins at all, no `unsafe-inline`. This is the single highest-leverage mitigation since it blocks the injection vector, not just the consequence.
- Never load third-party analytics/ad/tag-manager scripts — biggest realistic XSS vector in an otherwise-vanilla SPA.
- Never `console.log`/report the key; scrub it from any error-reporting payloads.
- Consider `sessionStorage` instead of `localStorage` as a lower-blast-radius default (cleared on tab close) — trade convenience (re-enter key each session) for a smaller exposure window; make it a user toggle if both matter.
- Document for users: scope/rotate the key in the provider's dashboard, this is an inherent property of any pure-client BYOK architecture, not a bug specific to this app.

## Recommendation table

| Capability | Anthropic | OpenAI | Gemini |
|---|---|---|---|
| Browser CORS | Yes, needs `anthropic-dangerous-direct-browser-access: true` header | Yes, standard Bearer | Yes, key as query param |
| Forced JSON | Tool-use + `tool_choice` (no native json mode) | `response_format: json_schema` (native, `strict:true`) | `responseSchema` + `responseMimeType:"application/json"` (native, OpenAPI-subset schema) |
| Image generation | No | Yes — `gpt-image-1`, always b64_json | Yes — `gemini-*-image` via same `generateContent` endpoint |
| Streaming | SSE supported, skip for KISS | SSE supported, skip for KISS | SSE (`alt=sse`) supported, skip for KISS |

## Unresolved questions
1. Exact Sept 2026 model IDs for all 3 providers — don't hardcode, fetch via each provider's `/models` list endpoint at runtime and let user pick/default-to-newest.
2. Real byte-size numbers for sucrase vs esbuild-wasm vs @swc/wasm-web weren't independently benchmarked in this pass (search results were generic/comparison-site fluff) — worth a 10-min spike (`npm view <pkg> dist.unpackedSize` + actual Vite-bundled output) before committing, though the sync-vs-async-WASM-init argument alone is enough to pick sucrase regardless of exact KB delta.
3. Whether OpenAI's `images/generations` endpoint has the *exact same* CORS posture as `chat/completions` wasn't explicitly confirmed (only inferred from the general "OpenAI API is browser-callable" pattern) — verify with one live fetch call during implementation; if blocked, Gemini image gen is the fallback path already covered above.
