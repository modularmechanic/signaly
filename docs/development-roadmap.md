# Development Roadmap

Source plan: `plans/260902-1445-signaly-2d-modular-synth-rework/plan.md`.

## Phases

| # | phase | status | group | effort |
|---|---|---|---|---|
| 01 | Foundation: engine, state, storage | Complete (2026-09-02) | 1 | 8h |
| 02 | Modules batch A (15: sources/filters/env) | Complete (2026-09-02) | 2 | 6h |
| 03 | Modules batch B (14: amp/mix/fx/voices) | Complete (2026-09-02) | 2 | 6h |
| 04 | Modules batch C (11: seq/drums/meters/out) | Complete (2026-09-02) | 2 | 7h |
| 05 | UI kit: atoms, molecules, panel CSS | Complete (2026-09-02) | 2 | 6h |
| 06 | Rack workspace + app shell | Complete (2026-09-02) | 3 | 6h |
| 07 | User-module core + BYOK LLM | Complete (2026-09-02) | 2 | 7h |
| 08 | Builder UI: chat, code, faceplate | Complete (2026-09-02) | 3 | 5h |
| 09 | Integration, tests, README, review | Complete (2026-09-12) | 4 | 3h |

Phase 09 status: the full gate (`typecheck`, `lint`, `vitest run` — 59 files / 382 tests, `build`)
is green on the complete tree. The browser checklist
(`plans/reports/integration-260902-1730-phase-09-browser-checklist.md`) is cleared, the CodeRabbit
pass has run and its findings are addressed, and two refactor rounds have landed since. What remains
is not code: the two questions in `plans/open-questions.md` need a real screen reader and a live
OpenAI key, neither of which any session has had.

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

### Deferred (phase 09 integration report — still open, re-checked 2026-09-12)

- TPT SVF core duplicated in `svf`/`noiselab`/`formant`/`wasp` (inline in process loops) — a shared
  class would be a behaviour-affecting refactor, not a pure DRY cleanup. Still four copies
- Seconds-based one-pole coefficient duplicated in `adsr`/`noiselab`/`snh` — differs from the ms/Hz
  variants elsewhere, left as-is. Still three copies
- `mix` normalling. `NativeSpec.onConnectionChange` now exists and `rack.ts` calls it on both ends of
  every connect and disconnect, but `mix.native.ts` does not implement it, so the normalling the plan
  described still does not happen. The hook is no longer the missing piece; the module is

### Closed since (verified in the source)

- `volt` no longer builds an analyser at all — it is a gain pass-through whose `m.ext.text` carries
  the attenuverter readout, so `display: 'text'` is the whole display and the contradiction is gone
- `--shadow`/`--highlight` are gone from the stylesheets entirely, so there is nothing left to derive
  or to define in `tokens.css`

### Unresolved (integration report)

- OpenAI `images/generations` browser CORS behavior still unverified (needs a live API key)
- Keyboard patching flow unverified with a real screen reader (announcements confirmed only in the
  DOM live region). Delete-to-disconnect on a focused jack is equally unverified
