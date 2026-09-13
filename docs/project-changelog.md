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
- `att(jack, label, id?)` in `core/types.ts` — the whole declaration of an attenuverter, fixed ±1
  range included, so the four numbers live in one place. 62 uses across 28 defs
- `ModuleDef.screen?: boolean` reserves the screen box without naming a renderer, for a module whose
  `.parts.tsx` fills it
- `modules/display-contract.ts` — the display contract as code: one `DisplayRow` per kind with a
  `needs` line and up to two checks, plus `whyNotReady(def, m)`. `check-def.ts` calls it with `null`
  for the static half and `DisplayNode` calls it live
- `features/user-modules/check-def.ts` — `checkDef(def)`, the single well-formedness answer for a
  `ModuleDef`, shared by the User Module path and the built-in sweep
- `features/user-modules/lifecycle.ts` — `install` / `activate` / `check` / `remove` / `restoreAll` /
  `list`, the whole life of a user module in one module
- `hooks/jack-registry.ts` and `hooks/jack-interaction.ts` — the patching module. Every entry point
  returns an `Outcome` carrying the `JackDef`s involved, so the screen-reader announcer subscribes
  instead of diffing the Rack Snapshot
- `ui/molecules/cable-overlay.ts` — DOM-free Cable seg builder: one rope formula, the per-cable sag
  and shade jitter, and the hit-testing geometry
- `hooks/canvas-tokens.ts` — `readTokens(el?)`, so canvas paint is token-sourced and no canvas file
  names a literal colour
- `ui/molecules/modal-dialog.tsx` — `{ label, onClose, children }`, owning backdrop, Escape, initial
  focus, focus trap and focus restore for every dialog
- `--u` (`calc(var(--hp) / HP_PX)`), published from `main.tsx` with the jack and fader widths: the
  rack's scaling unit, so `--hp` alone is the zoom. Type, 1px hairlines and the ≥44px pointer targets
  deliberately stay in pixels
- `data-def-id` on `.module-panel` — a per-Module CSS styling seam; `mix8.css` is the one built-in
  using it. The custom-property contract it belongs to is documented in the `controls.css` header
- A `forced-colors: active` block in `base.css`
- `tests/dsp-harness.ts` `loadProcessor(slug, over?)` and `tests/dsp-smoke-sweep.test.ts` — every DSP
  clears the same NaN/range floor as an AI-generated User Module, with the bound read out of
  `dsp-verify.ts` so the two floors are one number
- `src/styles/cvd-palette.test.ts` enforcing the colour-vision budget on the four Signal Kind colours
- `src/styles/control-geometry.test.ts` guarding the TS↔CSS seam: the published units, the knob
  sweep, the fader cap, the piano black key, the screws and the forced-colors block
- `docs/adr/` 0003 restoring a stored user module does not re-verify its DSP, 0004 a Patch references
  its user modules and never carries them, 0005 the rack scales by `--hp` but type and pointer
  targets do not, 0006 touch devices get bigger targets, not bigger hardware

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
- `defaults()` is gone from all 34 DSPs. `seedParams(def, live?)` in `engine/node-factory.ts` is the
  one param source, used by the live rack and by `verifyDsp`'s offline render alike, so a method
  restating def initials was dead weight that could only disagree. `Base.defaults()` remains for
  state a definition cannot describe; nothing overrides it today
- `KnobDef.fmt` is now required. It is the unit and, for the integer-stepped names, the drag
  quantisation, and `FMT_RANGE` bounds the range each name implies
- `HP_PX` and `PANEL_H` moved out of `core/types.ts` into `modules/panel-layout.ts`, now the sole
  owner of panel geometry including `MIN_CONTROL_PX` and the jack and fader widths. `main.tsx`
  publishes them as custom properties, so the stylesheets read the constant instead of restating it
- `fitPanel(def, maxHp)` is the single verdict on whether a def lays out and, if not, the narrowest
  HP that would. `computePanel`'s 0..1 clamp is demoted to a no-garbage backstop that decides nothing
- One well-formedness checker, `check-def.ts`, used by both the User Module path and
  `tests/module-contract-sweep.test.ts` over all 41 built-ins. `validate.ts` stays in front of it as
  the untrusted-input parser — string lengths, jack/knob/node caps — and that split is deliberate:
  a list cap is a parser concern, a knob's range against its `fmt` is a contract concern
- A declared `display` whose feed is missing now renders a visible `NO <DISPLAY>` placeholder with
  the reason, instead of a silent blank. `mix8` and `seq` declare `screen: true` rather than a kind
  they never render, and declaring both is a contract error
- A Patch naming an unregistered module raises a notice listing what was skipped, instead of
  dropping the module and its Cables in silence
- `tests/module-catalog.test.ts` dropped its frozen module list and its count: the registry glob is
  the registration, so a 42nd module is registered by existing and nothing may claim otherwise.
  Per-module rules moved to `tests/module-contract-sweep.test.ts`
- `features/user-modules/runtime-registry.ts` replaced by `lifecycle.ts`; `hooks/patch-state.ts`
  replaced by `jack-interaction.ts` + `jack-registry.ts`; `engine/patch.ts` (two one-line wrappers
  around `AudioNode.connect`/`disconnect`) folded into `rack.ts`'s `wireCable`
- `cable-canvas.tsx` is a thin painter over `useCanvas` now that `cable-overlay.ts` owns the geometry
- `ui/atoms/label.tsx`, `ui/atoms/screw.tsx`, `ui/molecules/jack-row.tsx` and
  `ui/molecules/knob-group.tsx` deleted — the computed panel emits nodes, so none had a caller left
- `restoreAll()` runs at boot from `ui/pages/rack-page.tsx`, non-blocking, and deliberately does not
  re-verify a stored module's DSP (ADR-0003)

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
- The piano's black keys sat 4px off their white-key boundary. The key width and the offset that
  centres it were two numbers, and the offset kept the half of a width the panel no longer had after
  the rescale. `--bk-w` is now the one owner and the offset is `var(--bk-w) / 2`
- Roughly 78px of dead faceplate under every scope, and 51px under the piano. Screen height was
  pinned in three places that disagreed — the display band the layout computes, a fixed height on
  the recess, and another on the canvas inside it. The band is the only owner now: the recess fills
  it and the canvas fills the recess, with no fixed pixel height on the way down
- The focus ring vanished entirely under `forced-colors: active`, because the global
  `:focus-visible` indicator is a `box-shadow` and that mode strips it. An `outline` is drawn in
  system colours instead, and the controls that are nothing but paint get a `CanvasText` silhouette
- Jack columns were mis-packed on touch: two stylesheets grew the socket to 46px and the fader to
  26px under `pointer: coarse`, while `panel-layout.ts` kept packing columns against the un-grown
  widths. The art growth is gone and both widths have one owner; the ≥44px pointer targets that were
  the actual touch affordance are untouched. See ADR-0006
- `src/modules/dist/` was untracked: an unanchored ignore rule for the build output swallowed the
  DIST module's source too, so a fresh clone was missing a module entirely. The rule is anchored now

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
- `docs/system-architecture.md` reconciled with the source. The invariant claiming `rack.ts` was the
  sole caller of Web Audio APIs was false, and false when written: it now names what `rack.ts`
  actually owns — the rack's audio mutations — and tables the six other files that touch Web Audio
  by design. The display contract table is gone in favour of a pointer at `display-contract.ts`,
  because a prose copy of a table the code can own is exactly what drifted. New sections for
  patching, cable and canvas paint, dialogs, the validation split, the styling seams and the sweeps
- The custom-property contract — every property an atom's CSS may read, and its one owner — is
  documented in the `controls.css` header, linked rather than restated

### Cleared

Every item on the phase 09 integration checklist
(`plans/reports/integration-260902-1730-phase-09-browser-checklist.md`) has landed: patch-menu
`onSubmit`, `parsePatchFile` coverage, `func`'s dead `display`, the generic `{t:'led', id, v}`
message, the faceplate blob on `user:` panels, the lazy LLM client import, `lpCoeff`/`Lcg` promoted
into the prelude, a lighter `--kind-c`, and un-truncated knob labels on 4 HP panels.

### Still open

The CodeRabbit pass has since run and its findings are addressed. Two questions in
`plans/open-questions.md` remain open, both because they need something no session had: the keyboard
patching flow is unverified with a real screen reader (announcements confirmed only in the DOM live
region), and OpenAI's `images/generations` browser CORS posture was inferred rather than confirmed,
for want of a live key.

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
