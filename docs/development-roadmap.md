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
| 04  | Runtime and bundle performance (P1–P4)              | In progress                                        | 3h     |
| 05  | Known defects from the CodeRabbit pass              | Complete (2026-09-03)                              | 4h     |
| 06  | Accessibility verification, release smoke, docs     | Docs complete (2026-09-03); the rest needs a human | 2h     |

Phase 06's browser rehearsal, screen-reader walkthrough, OpenAI CORS check, first public push and live
smoke test all need a person at the keyboard and are listed in `plans/open-questions.md`.

Gate on the shipped tree: `typecheck` clean, `lint` clean, `vitest run` 53 files / 281 tests passing,
`npm audit --audit-level=high` 0 vulnerabilities. 41 modules under `src/modules/`.

## Deferred / future

From the plan's **Out of scope** and the phase 09 integration report's **Deferred** list.

### Out of scope (plan)

- Backend, accounts, public module sharing, multiplayer, entitlements, marketing site
- 3D / Three.js
- E2E / Playwright tests
- MIDI learn
- Streaming LLM responses
- Checkpoints
- Cable colour picker
- Drum bus

### Deferred (phase 09 integration report — recorded, not fixed)

- TPT SVF core duplicated in `svf`/`noiselab`/`formant`/`wasp` (inline in process loops) — a shared
  class would be a behaviour-affecting refactor, not a pure DRY cleanup
- Seconds-based one-pole coefficient duplicated in `adsr`/`noiselab`/`snh` — differs from the ms/Hz
  variants elsewhere, left as-is
- `mix.onConnectionChange` normalling described in the plan does not exist in the source — not implemented
- `volt` uses `display: 'text'` although it also exposes an analyser
- `--shadow`/`--highlight` tokens derived via `color-mix` in phase-05 CSS rather than defined in
  `tokens.css`

### Unresolved

Tracked in `plans/open-questions.md`, which is the single list. Still open at 0.2.0: the license and
DSP-provenance question, whether the git history goes public as-is, the screen-reader walkthrough of
keyboard patching, the OpenAI image CORS check with a live key, and the first public push with its
repo-settings checklist and live smoke test.
