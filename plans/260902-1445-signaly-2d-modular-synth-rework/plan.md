---
title: "Signaly: lean 2D modular synth rework of modvibez"
description: "Rebuild modvibez as a lean 2D-only accessible React SPA with 40 built-in modules and BYOK LLM-assisted user module authoring"
status: in-progress
priority: P2
effort: 54h
branch: main
tags: [feature, frontend, refactor, web-audio, react]
created: 2026-09-02
---

# Signaly

New lean SPA at `<repo>`, rewritten from `cablewerk-v2` (121K LOC → target ~12K).
2D only, no backend, no auth, no multiplayer, no 3D. Vite 8 + React 19 + TS strict + Zustand 5 + Vitest 4.
Runtime deps: react, react-dom, zustand, sucrase, idb-keyval. Nothing else.
41 built-in modules (the planned 40 plus MIX 8) as def+dsp/native. Panels are computed from the def; authored `panel` coords are the exception, not the rule (ADR 0001).
Users author modules from JSON def + TS DSP; BYOK chat (localStorage key) generates them; sucrase transpile → blob → `audioWorklet.addModule`.
Storage: localStorage (versioned envelope) for JSON, IndexedDB (idb-keyval) for faceplate blobs. One thin module each, no adapters.

## Phases
| # | phase | status | progress | group | effort | link |
|---|---|---|---|---|---|---|
| 01 | Foundation: engine, state, storage | done | 100% | 1 | 8 | [phase-01](phase-01-foundation-engine-state-storage.md) |
| 02 | Modules batch A (15: sources/filters/env) | done | 100% | 2 | 6 | [phase-02](phase-02-modules-batch-a-sources-filters-env.md) |
| 03 | Modules batch B (14: amp/mix/fx/voices) | done | 100% | 2 | 6 | [phase-03](phase-03-modules-batch-b-amp-fx-voices.md) |
| 04 | Modules batch C (11: seq/drums/meters/out) | done | 100% | 2 | 7 | [phase-04](phase-04-modules-batch-c-seq-meters-output.md) |
| 05 | UI kit: atoms, molecules, panel CSS | done | 100% | 2 | 6 | [phase-05](phase-05-ui-kit-atoms-molecules-styles.md) |
| 06 | Rack workspace + app shell | done | 100% | 3 | 6 | [phase-06](phase-06-rack-workspace-and-app-shell.md) |
| 07 | User-module core + BYOK LLM | done | 100% | 2 | 7 | [phase-07](phase-07-user-modules-and-byok-llm.md) |
| 08 | Builder UI: chat, code, faceplate | done | 100% | 3 | 5 | [phase-08](phase-08-builder-ui-chat-code-faceplate.md) |
| 09 | Integration, tests, README, review | partial | 85% | 4 | 3 | [phase-09](phase-09-integration-and-review.md) |

Phase 09 outstanding: the planned CodeRabbit pass never ran, and the Minor/Nit findings from the
`code-reviewer` pass are still open. Everything else in phase 09 landed — the integration checklist
is cleared, the gate is green (typecheck, lint, 207 tests, build), and the README is written.

## Dependency graph
```
                       ┌── 02 modules A ──┐
                       ├── 03 modules B ──┤
  01 foundation ───────┼── 04 modules C ──┼──► 06 rack workspace ──┐
   (blocks all)        ├── 05 ui kit ─────┤                        ├──► 09 integration
                       └── 07 user+llm ───┴──► 08 builder ui ──────┘
```

## Execution strategy
- Group 1 solo: 01. Group 2 parallel ×5: 02, 03, 04, 05, 07. Group 3 parallel ×2: 06, 08. Group 4 solo: 09.
- Phases 01–05,07 verify with `npm run typecheck && npm run lint && npx vitest run`. `npm run dev`/`build` only work from 06 onward (06 owns `main.tsx`+`app.tsx`).
- Max 5 concurrent agents. No phase edits another phase's file — see matrix.

## File ownership matrix
| phase | exclusive paths |
|---|---|
| 01 | root configs, `index.html`, `src/core/`, `src/engine/`, `src/state/`, `src/storage/`, `src/hooks/`, `src/modules/registry.ts`, `src/modules/panel-layout.ts`, `src/styles/tokens.css`, `src/styles/base.css`, `src/ui/atoms/{led,step-grid,env-display,channel-meter,mini-piano}*`, `tests/module-contract-sweep.test.ts` |
| 02 | `src/modules/{vco,duo,lfo,noise,noiselab,quad,svf,ladder,comb,formant,wasp,adsr,func,atn,snh}/` |
| 03 | `src/modules/{vca,mix,mult,comp,gate,ddelay,sdelay,reverb,chorus,flanger,crush,dist,tape,monov}/` |
| 04 | `src/modules/{clock,clockdiv,euklid,seq,arp,kbd,drum2,scope,volt,out,voct}/` |
| 05 | `src/ui/atoms/*` (rest), `src/ui/molecules/{module-header,jack-row,knob-group,cable-canvas,scope-display}*`, `src/styles/{controls,panel,cables}.css` |
| 06 | `src/main.tsx`, `src/app.tsx`, `src/ui/organisms/{module-panel,rack-row,module-browser,patch-menu,settings-dialog}*`, `src/ui/templates/rack-workspace*`, `src/ui/pages/rack-page*` |
| 07 | `src/features/user-modules/`, `src/features/llm/`, `src/features/faceplate/` |
| 08 | `src/ui/organisms/{module-builder-chat,dsp-code-panel,faceplate-editor,user-module-library}*`, `src/ui/molecules/{chat-message,code-editor,image-cropper}*`, `src/ui/templates/builder-workspace*`, `src/ui/pages/builder-page*`, `src/styles/builder.css` |
| 09 | `README.md`, `tests/module-catalog.test.ts` |

## Key decisions
- **Superseded by [ADR 0001](../../docs/adr/0001-panel-geometry-computed-by-default.md):** every
  built-in panel is now computed by `layoutPanel(def)`; the per-module `<id>.panel.ts` files are gone
  and authored `panel` survives as the documented exception (MIX 8). Original decision below.
- **Panel geometry is authored for built-ins, computed as fallback.** Each of the 40 modules ships `<id>.panel.ts` (coords converted from source `.front-panel.ts`, stripped of `assetId`/`labelStyle`/`elementId`). `layoutPanel(def)` returns `def.panel ?? computed`. User modules may supply `panel` (e.g. to align with a faceplate image) or omit it. The `panel-runtime-model.ts` (942 L) `if (id === …)` chain is still dropped. <!-- Updated: Validation Session 1 - panel geometry -->
- **Worklet URL**: `import workletUrl from './worklet-entry.ts?worker&url'`. The brief's `new URL(…, import.meta.url)` is documented in the source as broken under Vite build (raw `.ts` served as an asset, glob never expanded). Corrected.
- `ui.display` collapses 12 `PanelDisplayVariant`s to `def.display?: 'scope'|'meter'|'steps'|'env'|'piano'|'text'`.
- Dropped from `ModuleDef`: `v1ui`, `brand`, `subtype`, `extraOuts`, `ui`, `PanelBlueprint`, vibes, finishes. `cvIn` becomes a plain string.
- Dropped from `Cable`: `color`. From `RackRow`: `rackId`. No racks/stacks/power. **Rows have fixed HP capacity**: `settings.rowWidthHp` (default 120, user-adjustable); `rack.ts` rejects an add/duplicate/move whose declared `def.hp` would overflow the target row (no effective-HP solver). **Superseded by [ADR 0002](../../docs/adr/0002-adding-a-module-is-never-blocked-by-a-full-row.md):** add/duplicate into a full row spawns a new row beneath instead of refusing (only a drag still refuses), and the row-width range is now 120–240 HP, default 120. <!-- Updated: Validation Session 1 - row capacity -->
- No barrel `index.ts` in hot paths (defeats tree-shaking). No router lib — `ui-store.view: 'rack' | 'builder'`.
- Provider model IDs are fetched at runtime (`/v1/models` etc.), never hardcoded.

## Out of scope
Backend, accounts, public module sharing, multiplayer, entitlements, marketing site, 3D/Three.js, E2E/Playwright, MIDI learn, streaming LLM responses, checkpoints, cable colour picker, drum bus.

## Unresolved questions
Tracked in [../open-questions.md](../open-questions.md). 1 (CVD palette) and 3 (`navigator.storage.persist()`)
are closed; the keyboard-patching flow is still unverified with a real screen reader.

## Validation Log

### Session 1 — 2026-09-02
**Trigger:** initial plan creation (`/plan:parallel` → `/plan:validate`)
**Questions asked:** 5

#### Questions & Answers
1. **[Architecture]** The plan computes every panel layout from the module definition (no hand-placed coordinates). That kills ~8,000 generated lines, but an imported faceplate image then gets controls auto-placed over it. How should panel geometry work?
   - Options: Computed + optional override (Recommended) | Computed only | Port authored coords for all 40
   - **Answer:** Port authored coords for all 40
   - **Rationale:** Eurorack look matters more than the line count; built-ins keep the source's hand-placed panels. Computed layout survives only as the fallback for user modules without `panel`.
2. **[Scope]** The 40 built-in modules were chosen for small DSP, clean licensing, and mostly standard panels. Dropped: spect, bbd, adrum, chordv, and the big mixers. Accept this list?
   - Options: Accept the 40 as listed (Recommended) | Swap in adrum for comp | I'll list swaps myself
   - **Answer:** Accept the 40 as listed
   - **Rationale:** Batches 02/03/04 stay as planned.
3. **[Architecture]** The plan drops the source's HP-capacity solver and rack cases. How should rows behave?
   - Options: Rows scroll horizontally, no HP cap (Recommended) | Fixed HP per row (e.g. 104 HP) | Single wrapping flow, no rows
   - **Answer:** Fixed HP per row (e.g. 104 HP)
   - **Rationale:** Eurorack realism: a row rejects modules that do not fit. Adds a capacity check in `rack.ts`, a row-width setting, and a "row full" notice in the UI.
4. **[Architecture]** Users may want Anthropic for chat and OpenAI or Gemini for faceplate images. How should API keys be stored?
   - Options: One key per provider (Recommended) | Single key + provider dropdown
   - **Answer:** One key per provider
   - **Rationale:** Already what phases 01/06/07 specify; confirmed, no change.
5. **[Scope]** The source SEQ-8 stores 64 banks of 8 steps. The plan reduces it for v1. How big should the built-in step sequencer be?
   - Options: 1 pattern x 8 steps (Recommended) | 1 pattern x 16 steps | 8 patterns x 8 steps
   - **Answer:** 1 pattern x 8 steps
   - **Rationale:** Matches phase 04 as written; confirmed, no change.

#### Confirmed Decisions
- Panel geometry: authored `<id>.panel.ts` for all 40 built-ins; computed fallback for user modules — look over line count.
- Module list: the 40 as listed.
- Rows: fixed HP capacity, default 104, adjustable in settings.
- API keys: one per provider in localStorage.
- seq: 1 pattern × 8 steps.

#### Action Items
- [x] Phase 01: `ModuleDef.panel?`, `'led'` node kind, `layoutPanel` fallback rule, `rowUsedHp` + capacity rejection in `rack.ts`, `settings.rowWidthHp`.
- [x] Phases 02/03/04: port `<id>.panel.ts` per module (conversion recipe), +1h each.
- [x] Phase 06: row header shows used/total HP, "row full" notice, row-width input in settings.
- [x] Phase 07: optional `panel` in user-module schema + validation + prompt mention.
- [x] Phase 08: faceplate editor hint that coords can be supplied for alignment.

#### Impact on Phases
- Phase 01: Architecture (types, panel-layout, rack.ts capacity, settings).
- Phase 02, 03, 04: Key Insights + port recipe + success criteria (panel files now ported).
- Phase 06: Requirements (row capacity UI, settings row width).
- Phase 07: Requirements (optional `panel` in schema/prompt).
- Phase 08: Requirements (faceplate alignment hint).
