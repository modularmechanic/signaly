# Phase 09 — Integration, test run, README, code review

## Context links
- Plan: [plan.md](plan.md) · All phases: [01](phase-01-foundation-engine-state-storage.md) [02](phase-02-modules-batch-a-sources-filters-env.md) [03](phase-03-modules-batch-b-amp-fx-voices.md) [04](phase-04-modules-batch-c-seq-meters-output.md) [05](phase-05-ui-kit-atoms-molecules-styles.md) [06](phase-06-rack-workspace-and-app-shell.md) [07](phase-07-user-modules-and-byok-llm.md) [08](phase-08-builder-ui-chat-code-faceplate.md)
- Reports: all four in `scout/` and `research/`

## Parallelization Info
- **Group:** 4 (solo, last)
- **Runs with:** nothing
- **Waits for:** 01–08, all complete

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: partial · Review status: partial — CodeRabbit pass never ran and the Minor/Nit `code-reviewer` findings are still open; integration checklist cleared, gate green (typecheck, lint, 207 tests, build), README written
- Close the loop: prove the 40 modules are all present and working, run the full gate, write the README, and put the whole codebase through CodeRabbit and the `code-reviewer` subagent. Also the collection point for every "raise it in phase 09" item the parallel phases deferred.

## Key Insights
- Eight phases wrote code in five concurrent lanes; the integration risks are exactly at the seams the lanes could not test: registry ↔ modules, panel-layout ↔ 40 real defs, cable canvas ↔ real jack rects, phase-07 core ↔ phase-08 UI, `app.tsx` ↔ `builder-page.tsx`.
- Phases 02–05 and 07 could not run `npm run dev` or `npm run build` (phase 06 owns `main.tsx`/`app.tsx`). This is the first phase where the **full** gate — including `build` — is meaningful across everything.
- Deferred items are expected here by design: duplicated DSP helpers (02/03 were told not to touch the prelude), missing CSS tokens (05 was told not to add them), and any phase-07 function phase 08 wanted. Fix them now, in one pass, with the whole picture visible.

## Requirements
- Exactly 40 built-in module ids, matching the plan's list, no more and no fewer.
- `npm run typecheck && npm run lint && npm run test && npm run build` all green.
- README lets a stranger clone and run the app, and explains how to author a module by hand without an LLM.
- CodeRabbit review completed and its findings triaged; `code-reviewer` subagent review completed and its blocking findings fixed.

## Architecture
Catalog test, the one new source file in this phase:
```ts
// tests/module-catalog.test.ts
const EXPECTED = ['adsr','arp','atn','chorus','clock','clockdiv','comb','comp','crush','dist','drum2',
  'ddelay','duo','euklid','flanger','formant','func','gate','kbd','ladder','lfo','mix','monov','mult',
  'noise','noiselab','out','quad','reverb','scope','sdelay','seq','snh','svf','tape','vca','vco','volt',
  'voct','wasp'] as const;   // 40
test('catalog is exactly the 40 planned modules', () => {
  expect(new Set(allSpecs().map(s => s.def.id))).toEqual(new Set(EXPECTED));
});
```
This is separate from phase-01's `module-contract-sweep.test.ts` (per-def invariants, no count) so that phases 02–04 could each stay green in isolation.

## Related code files
**Create:** `README.md`, `tests/module-catalog.test.ts`
**Modify (integration fixes only, as the review surfaces them):** any file, but each change stays small and is attributed to a specific finding.
**Delete:** any scaffolding or dead file the review turns up.

## File Ownership
Exclusively owns `README.md` and `tests/module-catalog.test.ts`. Holds a repo-wide edit licence for integration and review fixes only — this phase runs alone, so there is no concurrency risk, but the licence is not a mandate to refactor.

## Implementation Steps
1. **Integration checklist** — walk each seam and fix what is broken:
   - [ ] `allSpecs()` returns exactly 40 specs; every worklet id has a registered processor and every native id has a `native.ts`.
   - [ ] `panel-layout.ts` produces a sane panel for all 40 — open each in the browser. Fix layout rules generically; add zero per-module branches.
   - [ ] Patch `vco → svf → vca → out`, turn every knob on the path, confirm audio and no console errors.
   - [ ] Keyboard-only pass: add a module, patch it, change a knob, save the patch — no mouse. Live region announces each step.
   - [ ] Save → reload → load restores modules, knob values, switches, cables, and `seq`'s `ext`.
   - [ ] Export a patch, re-import it, and confirm a truncated/corrupt file is rejected rather than throwing.
   - [ ] With a real key: generate a module in the builder, verify, preview, save, reload, and add it from the rack browser under `CUSTOM`.
   - [ ] Faceplate: import an image, crop it, apply, reload, confirm it survives (IndexedDB).
   - [ ] Reduced-motion on: no knob rotation transition, no cable animation.
   - [ ] CVD simulator pass on the four signal colours (phase-05 deferred item) — adjust `tokens.css` if any pair collapses.
2. **Deferred-item sweep**: collect every "raise it in phase 09" note. Expect duplicated DSP helpers across batches (promote to `dsp-prelude.ts` only if three or more modules share the identical code — two is a coincidence), missing CSS tokens, and any phase-07 API gap phase 08 worked around.
3. **House rules**: every file under 200 lines except the documented `reverb.dsp.ts` exception; every filename kebab-case; no `TODO`, no `test.skip`/`.only`, no stub test, no unimplemented branch. Any of these is a blocker, not a note.
4. **Bundle sanity**: confirm the rack chunk does not contain sucrase or the LLM client (phase 06's `React.lazy` on the builder page), and that no DSP processor code lands in the main chunk — it belongs to the `?worker&url` worklet chunk.
5. **Full gate**: `npm run typecheck && npm run lint && npm run test && npm run build`.
6. **README.md** — short:
   - What it is (2 lines), a screenshot placeholder.
   - Quickstart: `npm i && npm run dev`, Node ≥24.
   - Scripts table.
   - "Author a module by hand": the `ModuleDef` JSON shape, the `class P extends Base` DSP shape, the exact list of available prelude symbols, the volt conventions, and the fact that panel geometry is computed.
   - "Bring your own key": which providers, what each supports (Anthropic = chat only, no images), where the key is stored, and the honest security note — a pure-client BYOK app cannot hide a key from XSS; scope and rotate it in the provider dashboard.
   - What is deliberately absent: no backend, no accounts, no sharing, no 3D, no E2E.
7. **Code review, in order:**
   a. `scout` pass over the finished tree to build the review context.
   b. CodeRabbit: `/coderabbit:review`, or `coderabbit review --type uncommitted --plain`. Triage every finding; fix or record a reason.
   c. `code-reviewer` subagent over the full diff. Fix every blocking finding, then re-run the full gate.
   d. Neither review is optional, and neither self-approves work this session authored — the reviewer pass is a separate lane from the authoring pass.
8. Re-run the full gate one last time after the review fixes.

## Todo list
- [ ] Integration checklist, all ten items
- [ ] Deferred-item sweep
- [ ] House-rule sweep (file size, naming, no placeholders)
- [ ] Bundle sanity check
- [ ] `tests/module-catalog.test.ts`
- [ ] `README.md`
- [ ] CodeRabbit review + triage
- [ ] `code-reviewer` subagent review + fixes
- [ ] Final full gate green

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run`, `npm run build` all pass.
- `tests/module-catalog.test.ts` proves exactly the 40 planned ids.
- Every integration-checklist item is ticked with an observation, not an assumption.
- Zero `TODO`/`FIXME`/`test.skip`/`.only`/stub tests in the tree.
- CodeRabbit and `code-reviewer` findings are all either fixed or recorded with a reason.
- README quickstart works from a clean clone.

## Conflict Prevention
Runs alone in group 4. No other phase is active, so the repo-wide edit licence is safe. Restrict changes to integration fixes and review findings — a "while I'm here" refactor at this point invalidates eight phases of review.

## Risk Assessment
- **Panel layout looks wrong across many modules** (high, most likely real problem): computed geometry meets 40 real defs for the first time. Budget for two or three rule iterations in `panel-layout.ts`. Resist per-module branches — that is precisely how the source grew a 942-line `if (id === …)` chain.
- **Cable rendering performance at scale** (medium): a 20-module patch with 30 cables is the first honest perf test. If the frame budget slips, the cause is almost certainly per-frame rect reads or a broad Zustand selector, not the canvas.
- **Review volume** (medium): a fresh 12K-line codebase produces a large first CodeRabbit run. Triage by severity; do not fix style nits that contradict the deliberate simplifications documented in the plan.
- **Deferred items turning out to be real design gaps** (low): if phase 08 worked around a missing phase-07 function by duplicating logic, fix it in phase 07's file, not by keeping the duplicate.

## Security Considerations
Final security pass, all four boundaries in one place:
- **API keys**: grep the whole tree for the key variables and confirm they appear in no `console.*`, template literal, thrown error, URL, or analytics payload. Confirm "clear all data" removes them.
- **CSP**: confirm `index.html` sets `script-src 'self' blob:` with no `unsafe-inline` and no third-party origin, and that the app still loads worklets (blob: is required for user modules).
- **User DSP sandbox**: confirm nothing user-supplied is ever evaluated on the main thread, that every forbidden global is rejected by a test, and that `verifyDsp`'s timeout actually fires on an infinite loop.
- **Untrusted JSON**: patch import, module import, and LLM proposals all validate before use, all bound their array lengths, and all reject rather than coerce.
- Confirm every `URL.createObjectURL` in the tree has a matching `revokeObjectURL`.

## Next steps
Ship. Backend, accounts, and public module sharing are a separate later plan — the storage layer is one thin module per concern, so swapping it is a contained change when that plan starts.
