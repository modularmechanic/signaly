# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased] — phase 09 integration fixes (in progress)

Identified in `plans/reports/integration-260902-1730-phase-09-browser-checklist.md`; not yet
committed.

- `patch-menu` form needs `onSubmit` so Enter in the preset-name field saves (currently only the
  Save button works)
- `preset-store.test.ts` coverage for `parsePatchFile` (corrupt-import path is untested directly)
- `func` module declares a dead `display: 'scope'` it doesn't use
- Generic `{t:'led', id, v}` worklet message for `clock`/`lfo`/`clockdiv` LEDs
- Faceplate blob not yet rendered on `.module-panel` for `user:` module ids
- Lazy-import the LLM client from `settings-dialog` to keep it out of the rack chunk
- Promote `lpCoeff(hz)` (shared by 7 modules) and the LCG noise generator (3 modules, if identical)
  into `dsp-prelude.ts`; update the builder system prompt and README symbol list
- Lighten `--kind-c` (protan/deutan ΔE currently 25.5 / 29.7) and re-measure contrast
- Un-truncate knob labels on narrow (4 HP) panels ("O…", "FRE…")
- House-rule sweep (general standards pass across the touched files)

## [0.1.0] — 2026-09-02

Initial rebuild of modvibez as a lean 2D-only Signaly SPA.

### Added

- Phase 01 foundation: audio engine (`rack.ts`, `node-factory.ts`, `patch.ts`, `snapshot.ts`),
  Zustand stores, versioned `localStorage`/IndexedDB storage, hooks, module registry, display atoms
- 40 built-in Eurorack-style modules across sources, filters, envelopes, amp/mix, FX, voices,
  sequencing/control, drums, meters, and output, each with an authored `<id>.panel.ts`
- UI kit: atoms, molecules, and panel/control/cable CSS
- User-module core: schema, validation, sucrase-based DSP transpile with a forbidden-global scan,
  offline `OfflineAudioContext` verification, and runtime worklet registration
- BYOK LLM client: one API key per provider (Anthropic, OpenAI, Gemini) in `localStorage`,
  runtime-fetched model ids, forced structured-JSON module proposals
- Rack workspace and app shell: row-based layout with fixed HP capacity per row, module browser,
  patch menu, settings dialog
- Builder UI: module-builder chat, DSP code panel, faceplate image editor, user-module library
- `ui-store` `settingsOpen` flag shared by the rack and builder views
- `tests/module-catalog.test.ts` cross-checking all 40 `def.worklet` names against their
  `registerProcessor` calls
- README covering quickstart, module authoring, and BYOK key handling

### Fixed

- `out` module: added a −6 dB master trim and changed the default LEVEL knob from 0.9 to 0.5 so a
  raw oscillator patched straight through is not near 0 dBFS (`c3d1cdf`)
