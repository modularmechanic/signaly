# Phase 08 — Builder UI: chat, DSP code panel, faceplate editor, library

## Context links
- Plan: [plan.md](plan.md) · Depends on: [phase-01](phase-01-foundation-engine-state-storage.md), [phase-05](phase-05-ui-kit-atoms-molecules-styles.md), [phase-07](phase-07-user-modules-and-byok-llm.md)
- Reports: [researcher-01](research/researcher-01-byok-llm-and-dsp-transpile-report.md) §1–3 · [researcher-02](research/researcher-02-2d-eurorack-ui-accessibility-storage-report.md) §4
- Source: no equivalent worth porting — `cablewerk-v2/src/module-lab/` is 19.9K LOC of exactly what this phase must not become.

## Parallelization Info
- **Group:** 3
- **Runs with:** 06
- **Waits for:** 01, 05, 07 (needs the atom kit and the whole headless user-module/LLM core)

## Overview
- Date: 2026-09-02 · Priority: P3 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- The face on phase 07: describe a module in chat, see the proposed def and DSP, edit the code, verify it, preview it in a throwaway rack row, give it a faceplate (imported+cropped or prompt-generated), and save it to the library. Everything here is presentation — no transpile, verify, provider, or storage logic lives in this phase.

## Key Insights
- Phase 07 already owns transpile/verify/register/providers/crop. This phase calls those functions and renders their results. Any logic that feels like it belongs in phase 07 does.
- **No Monaco.** A `<textarea>` with a monospace font and a line-number gutter is the whole editor. Monaco is ~2 MB for syntax colouring on a file the user rarely hand-edits.
- **No streaming.** One request, a spinner, a result (researcher-01 §1). Do not build an SSE UI.
- Anthropic cannot generate images — the "generate faceplate" button is **disabled with a tooltip**, never an error toast (researcher-01 §2).
- Crop is `createImageBitmap` + a 9-arg `drawImage`; no cropping library (researcher-02 §4). Store the resulting `Blob` in IndexedDB via phase-01's `image-store`.
- The builder is lazily loaded by phase 06's `app.tsx` — keep sucrase and the LLM client out of the rack path.

## Requirements
<!-- Updated: Validation Session 1 - faceplate alignment -->
- **Faceplate alignment**: after an image is applied, the preview overlays the module's current layout (authored `panel` or computed). A one-line hint under the preview says controls can be repositioned by asking the chat to add `panel` coordinates (e.g. "put the FREQ knob over the big dial at the top"); no drag-to-position editor in v1.
- The chat pane renders only when `api-key-store.hasAnyKey()`; phase 06's nav already gates the view, and this page re-checks so a deep link cannot bypass it.
- Every LLM-proposed def passes phase-07 `validate.ts` before it is shown as applicable, and every DSP passes transpile + verify before "Save" is enabled.
- Preview happens in a dedicated throwaway rack row that is cleared when the user leaves the builder — a broken user module must never be able to wedge the saved patch.
- All rendered LLM/user text is a text node. No `dangerouslySetInnerHTML` anywhere in this phase.
- The code editor's textarea is keyboard-accessible with a real `<label>`; Tab inserts a tab character only when the user has explicitly enabled it (otherwise Tab must escape the field).

## Architecture

Flow, end to end:
```
prompt ──► llm.chatJson(system=module-builder-prompt, schema)      [phase 07]
       ──► parseProposal(raw)                                       [phase 07]
       ──► validate(proposal.def)              ── invalid ─► show the message, offer "ask again with the error"
       ──► transpileDsp(proposal.dsp, name)    ── error ───► same
       ──► verifyDsp(code, name, outs)         ── error ───► same
       ──► registerUserModule(um)                            [phase 07]
       ──► preview row: rack.addModule(`user:<slug>`)
       ──► user tweaks knobs / edits DSP ──► re-transpile + re-verify on demand
       ──► Save ──► user-module-store.save(um)               [phase 01 storage]
```
A failed step never advances; the error string is appended to the chat as an assistant-side message with a one-click "retry with this error" that re-sends the prompt plus the failure text.

Components:
```
builder-page.tsx
  └ builder-workspace.tsx                  // 2-column: chat/library left, code+preview right
      ├ module-builder-chat.tsx            // organism: prompt box, message list, generate button
      │   └ chat-message.tsx               // molecule: role, text, optional error styling
      ├ dsp-code-panel.tsx                 // organism: editor + Verify button + verification result
      │   └ code-editor.tsx                // molecule: textarea + line-number gutter, nothing more
      ├ faceplate-editor.tsx               // organism: import | generate, fit/stretch/crop, preview
      │   └ image-cropper.tsx              // molecule: drag a crop rect over a canvas
      ├ user-module-library.tsx            // organism: list, load, delete, export/import JSON
      └ preview row                        // a single rack-row rendering the module under construction
```

Code editor molecule, deliberately minimal:
```tsx
// src/ui/molecules/code-editor.tsx
<div className="code-editor">
  <pre className="gutter" aria-hidden>{lineNumbers}</pre>
  <textarea value={src} onChange={e => onChange(e.target.value)}
            spellCheck={false} wrap="off" aria-label="Module DSP source" />
</div>
```
Gutter scroll is synced to the textarea's `scrollTop`. No highlighting, no autocomplete, no bracket matching.

Faceplate editor modes: **fit** (contain, letterboxed), **stretch** (fill, aspect ignored), **crop** (drag a rect, aspect locked to the panel). All three resolve to one call:
```ts
cropToFaceplate(srcBlob, { sx, sy, sw, sh }, { w: hp * HP_PX, h: PANEL_H })   // phase 07
```
`fit` and `stretch` are just precomputed crop rects — one code path, three presets. Result goes to `image-store.set(`faceplate:${slug}`, blob)` and the id onto `um.faceplateImageId`.

Library export/import is a plain JSON file, same envelope idea as patches:
```ts
{ format: 'signaly.module', version: 1, module: UserModule }   // no image; faceplate re-generated or re-imported
```

## Related code files
**Create:**
- `src/ui/pages/builder-page.tsx`
- `src/ui/templates/builder-workspace.tsx`
- `src/ui/organisms/{module-builder-chat,dsp-code-panel,faceplate-editor,user-module-library}.tsx`
- `src/ui/molecules/{chat-message,code-editor,image-cropper}.tsx`
- `src/styles/builder.css`
- Tests: `src/ui/organisms/dsp-code-panel.test.tsx`, `src/ui/organisms/module-builder-chat.test.tsx`, `src/ui/molecules/code-editor.test.tsx`

**Modify / delete:** none. **Port FROM:** nothing — this phase is written fresh.

## File Ownership
Exclusively owns `src/ui/pages/builder-page.tsx`, `src/ui/templates/builder-workspace.tsx`, the four builder organisms, the three builder molecules, and `src/styles/builder.css`. Must not touch `app.tsx` (phase 06 imports `./ui/pages/builder-page` — this phase only has to provide that path), any phase-05 file, or anything under `src/features/`.

## Implementation Steps
1. `builder-page.tsx`: re-check `hasAnyKey()`; if false render a short explainer with a button that opens phase 06's settings dialog, and nothing else.
2. `builder-workspace.tsx`: two-column layout, `builder.css` imported here (not in `app.tsx`).
3. `molecules/code-editor.tsx` + test — textarea, gutter, synced scroll, real label.
4. `organisms/dsp-code-panel.tsx`: the editor plus a Verify button that calls phase-07 `transpileDsp` then `verifyDsp`, rendering the returned message verbatim as a text node. Save stays disabled until verification returns `null`.
5. `molecules/chat-message.tsx` and `organisms/module-builder-chat.tsx`: prompt textarea, send button, message list, spinner during the request, and the "retry with this error" affordance on any failed step.
6. `organisms/faceplate-editor.tsx` + `molecules/image-cropper.tsx`: file input (`accept="image/*"`), the three modes, a canvas preview, and a Generate button that is disabled with a tooltip when the active provider is Anthropic. On apply, call `cropToFaceplate` and store the blob.
7. `organisms/user-module-library.tsx`: list from `user-module-store`, load into the builder, delete (also `del` the faceplate blob), export/import JSON with a size cap and phase-07 `validate` on import.
8. Preview: render one `rack-row` containing the in-progress module; tear it down on unmount so a half-broken module never persists.
9. `styles/builder.css` using `tokens.css` custom properties only.
10. Tests: `code-editor.test.tsx` (line numbers track content, Tab escapes the field by default); `dsp-code-panel.test.tsx` (Save disabled until verify succeeds; the error message renders as text); `module-builder-chat.test.tsx` (mocked client — a validation failure appends an error message and offers retry, and no request fires without a key).

## Todo list
- [ ] `builder-page.tsx` with the no-key state
- [ ] `builder-workspace.tsx` two-column layout
- [ ] `code-editor.tsx` + test
- [ ] `dsp-code-panel.tsx` + test (verify gate on Save)
- [ ] `chat-message.tsx` + `module-builder-chat.tsx` + test
- [ ] `faceplate-editor.tsx` + `image-cropper.tsx` (fit/stretch/crop, disabled generate on Anthropic)
- [ ] `user-module-library.tsx` (load/delete/export/import)
- [ ] Preview row with teardown on unmount
- [ ] `styles/builder.css`

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` pass.
- End-to-end by hand with a real key: prompt → proposal → verify → preview makes sound → save → the module appears in the rack browser under `CUSTOM` after a reload.
- A deliberately broken DSP (returns `NaN`) is rejected with a readable message and Save stays disabled.
- With only an Anthropic key stored, the faceplate Generate button is disabled and explains why; chat still works.
- With no key stored, the builder page shows the explainer and fires zero network requests.
- No `dangerouslySetInnerHTML` in the phase; no bundler warning about Monaco or any unlisted dependency.

## Conflict Prevention
Runs beside phase 06 only, on a disjoint file set. Phase 06 owns `app.tsx` and imports `./ui/pages/builder-page`; this phase provides that file and must not edit `app.tsx`. All transpile/verify/provider/crop logic stays in phase 07's files — if this phase needs a new function there, note it in the phase-09 checklist rather than adding a second implementation here.

## Risk Assessment
- **Scope creep back into module-lab** (high, the defining risk): the source's equivalent is 19.9K LOC. Diff viewers, JSON-patch protocols, artifact signing, project stores — none of them. If a feature is not in the flow diagram above, it is out.
- **Editor creep** (medium): syntax highlighting invites a highlighter, which invites Monaco. Textarea plus gutter, full stop.
- **Preview leaks into the saved patch** (medium): a preview module left in the rack survives a save and breaks the next load if the user module was never saved. Tear the preview row down on unmount, unconditionally.
- **Retry loops** (low): "retry with this error" can loop forever on a stubborn model. Cap automatic retries at zero — every retry is an explicit user click.
- **Provider errors surfacing keys** (low but serious): render only phase-07's normalised error strings, never a raw exception or a request object.

## Security Considerations
- **Never render LLM or user-module text as HTML.** Every message, error, label, and code string is a text node.
- **No key handling here.** Keys are read by phase-07's client from phase-01's store; this phase never reads, displays, or logs one. The settings dialog (phase 06) is the only entry point.
- **Imported module JSON is untrusted**: cap the file size, `JSON.parse` in a try/catch, check `format`/`version`, run phase-07 `validate` on the def, and run transpile + verify before the module can be registered — an imported module is exactly as untrusted as an LLM-generated one.
- **Image files are untrusted input**: decode through `createImageBitmap` (which fails safely on a malformed file), cap the source dimensions before allocating a canvas, and never render an imported file through a `data:` URL in an `<img srcset>` or a CSS `url()` built by concatenation.
- **Blob URLs** created for previews must be revoked on unmount.

## Next steps
Feeds phase 09.
