# Development Roadmap

Source plans: `plans/260902-1445-signaly-2d-modular-synth-rework/plan.md` (the rework) and
`plans/260903-0939-production-readiness-github-pages/plan.md` (production readiness).

## Rework (2026-09-02)

| #   | phase                                      | status                | group | effort |
| --- | ------------------------------------------ | --------------------- | ----- | ------ |
| 01  | Foundation: engine, state, storage         | Complete (2026-09-02) | 1     | 8h     |
| 02  | Modules batch A (15: sources/filters/env)  | Complete (2026-09-02) | 2     | 6h     |
| 03  | Modules batch B (14: amp/mix/fx/voices)    | Complete (2026-09-02) | 2     | 6h     |
| 04  | Modules batch C (11: seq/drums/meters/out) | Complete (2026-09-02) | 2     | 7h     |
| 05  | UI kit: atoms, molecules, panel CSS        | Complete (2026-09-02) | 2     | 6h     |
| 06  | Rack workspace + app shell                 | Complete (2026-09-02) | 3     | 6h     |
| 07  | User-module core + BYOK LLM                | Complete (2026-09-02) | 2     | 7h     |
| 08  | Builder UI: chat, code, faceplate          | Complete (2026-09-02) | 3     | 5h     |
| 09  | Integration, tests, README, review         | Complete (2026-09-03) | 4     | 3h     |

Phase 09 is complete: every browser-checklist item landed
(`plans/reports/integration-260902-1730-phase-09-browser-checklist.md`) and the CodeRabbit pass that it
deferred ran on 2026-09-03 (`plans/reports/coderabbit-260903-0800-signaly-review.md`).

## Production readiness (2026-09-03)

Evidence: `plans/reports/audit-260903-0939-production-readiness-findings.md`.

| #   | phase                                               | status                                             | effort |
| --- | --------------------------------------------------- | -------------------------------------------------- | ------ |
| 01  | Repo hygiene and release blockers (H1–H5)           | Complete (2026-09-03)                              | 1.5h   |
| 02  | Security hardening (S1–S9, S13)                     | Complete (2026-09-03)                              | 3h     |
| 03  | GitHub Pages deploy + CI + supply chain (D1–D4, S9) | Complete (2026-09-03)                              | 2.5h   |
| 04  | Runtime and bundle performance (P1–P4)              | Complete (2026-09-03)                              | 3h     |
| 05  | Known defects from the CodeRabbit pass              | Complete (2026-09-03)                              | 4h     |
| 06  | Accessibility verification, release smoke, docs     | Docs complete (2026-09-03); the rest needs a human | 2h     |

Phase 04's before/after measurements are in `plans/reports/perf-260903-0939-before-after.md` and its
results in the 0.2.0 changelog entry; the phase file itself still reads "planned". The repo is public
and releases are tagged v0.0.1 through v0.0.8. Phase 06's remaining steps need a person at the
keyboard and are listed under Unresolved below.

## Since v0.0.8 (unreleased)

The deep-module refactor has been ported onto master: one def checker for built-ins and user modules,
params seeded from the def, the display contract as code, the user-module lifecycle restored at boot,
and the patching, cable and dialog seams. The palette and forced-colors fixes landed alongside it.
Details in the `[Unreleased]` changelog entry.

Gate on the current tree: `typecheck` clean, `lint` clean, `vitest run` 130 files / 1163 tests
passing, production build clean. 101 modules under `src/modules/`.

## Deferred / future

From the plan's **Out of scope** and the phase 09 integration report's **Deferred** list, re-checked
against the source on 2026-09-13.

### Out of scope (plan)

None of these exist in the source:

- Backend, accounts, public module sharing, multiplayer, entitlements, marketing site
- 3D / Three.js
- E2E / Playwright tests
- MIDI learn
- Streaming LLM responses
- Checkpoints
- Cable colour picker
- Drum bus

### Deferred (phase 09 integration report — still open)

- The TPT SVF core is still inline in each process loop. The report named four copies
  (`svf`/`noiselab`/`formant`/`wasp`); `envfilt` and `morph` carry the same `g`/`a1`/`a2`/`a3` core,
  so there are six. A shared class would be a behaviour-affecting refactor, not a pure DRY cleanup
- The seconds-based one-pole coefficient `1 - Math.exp(-1 / (t * sampleRate))` is still inline, now in
  nine DSPs: `adsr`, `comp`, `envfilt`, `fmvoice`, `gate`, `monov`, `seq`, `seq16`, `snh`. The prelude
  offers only the millisecond (`onePoleCoeff`) and hertz (`lpCoeff`) variants
- `mix` normalling. `NativeSpec.onConnectionChange` exists and `rack.ts` calls it on both ends of every
  connect and disconnect, but no native module implements it, so the normalling the plan described
  does not happen. The hook is no longer the missing piece; the module is
- CodeRabbit #24: the `HEX` regex in `ui/molecules/module-header.tsx` accepts 5- and 7-digit hex,
  which CSS rejects. Unreachable while its only input is a `CAT_COLOR` constant

### Closed since (verified in the source)

- `volt` no longer builds an analyser — it is a gain pass-through whose `m.ext.text` carries the
  attenuverter readout, so `display: 'text'` is the whole display
- `--shadow`/`--highlight` are gone from the stylesheets, so there is nothing left to derive or to
  define in `tokens.css`

### Unresolved

Tracked in `plans/open-questions.md`, which is the single list. Still open: a local release rehearsal
of the production bundle, the VoiceOver walkthrough of keyboard patching, the OpenAI image CORS check
with a live key, the live smoke test at the Pages URL, the license and DSP-provenance question, and
whether to put the site on a custom domain.
