# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added

- MIX 8: 8-channel stereo mixer with per-channel 4-band EQ, pan, mute, and two bus inserts. The
  catalogue is now 41 modules and `tests/module-catalog.test.ts` asserts exactly that set
- Blackline visual rework: uniform near-black faceplates, category expressed only as an accent on
  the header hairline, knob value ring, fader fill, LED core and lit switch option, machined black
  hardware, and a 26 px HP scale (`HP_PX` / `--hp`). Spec:
  `plans/reports/design-260902-1800-signaly-visual-rework-spec.md`
- Scope and envelope traces take the module's category colour
- MAIN OUT spectrum and stereo-phase (correlation) displays
- Cables can be removed three ways: Delete on a focused jack at either end, double-click on a jack
  in both directions, and clicking the cable itself with a hover highlight. Cable hit-testing yields
  to controls so a click on a knob or jack still reaches it
- `docs/adr/` — 0001 panel geometry is computed by default, 0002 adding a module is never blocked by
  a full row
- `NativeSpec.onConnectionChange(m, dir, jack, connected)` so a native module can react to patching
- `KIND_NAME` in `core/types.ts` — one shared kind→word table instead of the same literal repeated
  across jack labels, cable styling and announcements

### Changed

- Adding or duplicating a module into a full row now spawns a new row directly beneath it instead of
  refusing. Dragging into a full row still refuses: the user aimed at that row
- Row width floor raised from 20 HP to 120 HP (range 120–240, default 120), so no built-in module can
  be too wide to place
- Per-module `<id>.panel.ts` deleted for all built-ins; `layoutPanel(def)`
  computes every panel and authored `ModuleDef.panel` survives only as the documented exception
  (MIX 8). Panel LEDs became declarative on the def
- `KnobDef.def` / `SwitchDef.def` renamed to `initial` — "def" meant both "definition" and "default"
  in the same type
- "Preset" is now "Patch" throughout the UI and prose, including `storage/patch-store.ts`. The
  `signaly.patch` format string and the `localStorage` key are unchanged

### Fixed

- Knob pointer and fader fill alignment
- Stale cable endpoints: the cable canvas now invalidates its cached jack rects on any rack mutation,
  not only on resize and scroll, so removing or reordering a module no longer draws cables at the old
  positions
- An attenuverting knob no longer skips the param push, so a native module can render its value
  (`volt`'s readout)
- Clock-sync LEDs on `ddelay`, `sdelay`, `tape`
- "Delete everything, permanently" now clears the IndexedDB faceplate store too, not just
  `localStorage`
- The module-generation prompt stated the pre-rescale HP and panel height
- `verifyDsp` closed its `OfflineAudioContext` in `finally`, so a timed-out verification no longer
  leaks a context per attempt. The wedged worklet render thread itself still needs a reload

### Docs

- Display contract table in `docs/system-architecture.md`: what each `display` kind requires on
  `m.ext` or from the worklet feed, and what its renderer reads. `ext` stays untyped on purpose and
  the table is the contract
- User-DSP threat model stated plainly in `README.md` and on the `FORBIDDEN` regex: the AudioWorklet
  scope and the CSP are the sandbox, the regex is unsound defence in depth, and the damage ceiling of
  an imported hostile module is the user's own tab
- MIX 8's insert returns cannot distinguish "no cable" from "a cable carrying silence"; a patched but
  silent return mutes the bus, matching a real console insert. Recorded as accepted behaviour
- Corrected `reverb.dsp.ts` line count and the worklet symbol list (`lpCoeff`, `Lcg`, `DENORMAL` were
  missing from a list called exhaustive)
- Agent skills config: `docs/agents/{issue-tracker,triage-labels,domain}.md` — issues are markdown
  files under `.scratch/<feature>/` (this repo has no remote), the five canonical triage labels, and
  the single-context domain docs rule

### Cleared

Every item on the phase 09 integration checklist
(`plans/reports/integration-260902-1730-phase-09-browser-checklist.md`) has landed: patch-menu
`onSubmit`, `parsePatchFile` coverage, `func`'s dead `display`, the generic `{t:'led', id, v}`
message, the faceplate blob on `user:` panels, the lazy LLM client import, `lpCoeff`/`Lcg` promoted
into the prelude, a lighter `--kind-c`, and un-truncated knob labels on 4 HP panels.

### Still open

The phase 09 CodeRabbit pass never ran and the Minor/Nit `code-reviewer` findings are unaddressed;
see `plans/open-questions.md` for the questions this session did not close.

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
