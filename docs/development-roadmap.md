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
| 09 | Integration, tests, README, review | In progress | 4 | 3h |

Phase 09 status: the full gate (`typecheck`, `lint`, `vitest run` — 32 files / 180 tests, `build`)
is green on the complete tree. Remaining work is the browser-checklist fix list and review pass —
see `plans/reports/integration-260902-1730-phase-09-browser-checklist.md`.

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
- `mix.patchState` normalling described in the plan does not exist in the source — not implemented
- `volt` uses `display: 'text'` although it also exposes an analyser
- `--shadow`/`--highlight` tokens derived via `color-mix` in phase-05 CSS rather than defined in
  `tokens.css`

### Unresolved (integration report)

- OpenAI `images/generations` browser CORS behavior still unverified (needs a live API key)
- Keyboard patching flow unverified with a real screen reader (announcements confirmed only in the
  DOM live region)
