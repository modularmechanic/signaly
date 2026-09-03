# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] — 2026-09-03

The 2D rework plus the production-readiness pass that made the repo publishable:
`plans/260903-0939-production-readiness-github-pages/`. Finding ids (H*, S*, D*, P*) refer to
`plans/reports/audit-260903-0939-production-readiness-findings.md`; `#n` refers to
`plans/reports/coderabbit-260903-0800-signaly-review.md`.

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
- MIT `LICENSE` and a `license` field in `package.json` (H2)
- `.nvmrc` and a `package.json` `engines` floor of Node 24 (H4)
- `.github/workflows/gate.yml` — the single definition of a releasable tree (`format:check`, `lint`,
  `typecheck`, `test`, `build`, `npm audit --audit-level=high`), exposed as a `workflow_call` so it
  has one copy; `ci.yml` calls it on every pull request and on the integration branch, and a red check
  blocks the merge (S9, D2)
- `.github/workflows/release.yml` — re-runs the gate on a published GitHub release, then builds with
  `--base="/<repo>/"` and publishes to Pages. A merge never deploys; a release does, and a release is
  always cut from a tag, so the live site always corresponds to a tag (D1, D2)
- `format:check` (`prettier -c .`) as a package script and the first step of the gate
- `.github/dependabot.yml` and `SECURITY.md` (S9)
- `public/favicon.svg` plus the favicon link and a `description` meta in `index.html` (D2)
- A React error boundary and global `error` / `unhandledrejection` handlers, so a render exception is
  a recoverable message instead of a blank page (S8)
- "Remember keys in this browser" in Settings — off by default (S2)
- A `react` / `react-dom` vendor chunk, so a content-only deploy does not re-download the framework (P4)

### Performance

Measured on the production build against a fixed 8-module reference patch, before and after, with the
numbers and method in `plans/reports/perf-260903-0939-before-after.md` (P1–P4).

- `ModulePanel` no longer subscribes to the module revision, so a knob drag commits the knob alone:
  60 panel renders per 60 parameter changes became 0. This was the one target the audit flagged that
  the app actually missed
- Scope traces decimate to one min/max column per CSS pixel and drop `shadowBlur` for an alpha
  under-stroke, halving scope draw cost (0.063 → 0.029 ms per frame) with no visible change
- Cable hit-testing is gated on pointer movement, so an idle rack runs 1 hit-test instead of one per
  frame (864 over a 10 s trace)
- Whole-thread scripting on the reference patch fell from 3.4 % to 1.9 %. The frame-cost and
  cable-draw budgets were already met before this pass; only the panel subscription was over

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

### Security

- API keys default to `sessionStorage`; only the "remember in this browser" opt-in puts them in
  `localStorage`. Keys already stored under the old rules stay put and arrive with the box ticked, so
  nothing on disk is orphaned. Model ids are not secret and stay in `localStorage` either way (S2)
- Gemini's key moved from the `?key=` query string to the `x-goog-api-key` header, keeping it out of
  devtools and HAR exports (S1)
- CSP: `object-src 'none'` added; the `frame-ancestors` directive dropped, because the spec ignores it
  in a meta CSP and browsers warn on every load — it needs a response header GitHub Pages cannot
  send (S3)
- Every provider request carries an `AbortSignal.timeout` (120 s) and reports a distinct deadline
  message, so a hung provider no longer leaves the builder's Send disabled forever (S6, #17)
- Documented, in the README, `SECURITY.md` and `docs/system-architecture.md`: every project site under
  one GitHub account shares the `<user>.github.io` origin and therefore its storage. Session-only keys
  shrink the window; only a custom domain closes it (S13)

### Fixed

- The DIST module is in the repo. `.gitignore`'s unanchored `dist` pattern had been swallowing
  `src/modules/dist/`, so a fresh clone shipped 40 modules and a red catalog test. `/dist` and
  `/coverage` are now anchored (H1)
- `Lcg.next` and `euklid`'s private RNG used 53-bit float arithmetic and degenerated to a 16403-value
  cycle; both now go through the shared `Math.imul`-based `Lcg` (#2, #3)
- `kbd` no longer leaves a note and its gate held when a key is released over a text field, with a
  modifier down, or after the window loses focus (#1)
- `gate`'s GATE OUT reads the gate decision instead of the envelope, so it no longer sits at 5 V for
  any RANGE above about −6 dB (#4)
- Restoring a patch saved on a wide rack into a narrow one no longer merges rows: `applySnapshot`
  creates every row up front and fills them bottom-up (#6)
- Accessibility: `aria-label` on the mini-piano keys (#7); `fKey`/`fChord`/`fShape` treated as integer
  formats so arrow keys step them one value at a time (#8); a radiogroup `Switch` moves focus with
  selection (#9); the module browser traps Tab and exposes `aria-selected` /
  `aria-activedescendant` (#25)
- Jack drag handles `pointercancel`, so a cancelled touch no longer leaves the `.hot` class, the
  `.compat` glow and two window listeners behind (#5)
- `readJson` rejects a payload whose shape does not match the fallback, so `{"v":1,"data":null}` under
  `signaly.patches.v1` no longer throws in the patch menu (S7, #16)
- `drum2`'s `pitch_cv` is declared `kind: 'p'`, and FORMANT's output clamp is ±5 V, both matching the
  conventions in `CONTEXT.md` (#12, #13)
- Clock-sync LEDs on `tape`, `sdelay` and `ddelay` scan the whole block instead of its first sample,
  and `euklid` re-posts its step display when the pattern changes while the clock is stopped
  (#14, #15)
- Smaller review fixes: builder registration guarded against overlapping requests and a rejecting
  `addModule` (#10, #11, #20); a negative pitch can be typed into a `seq` step (#18); "Row N added" is
  announced (#19); `out`'s stale `0.9` level fallback removed (#21); the canvas hook observes DPR
  changes (#22); a knob latches its drag axis past a slop radius (#23)
- The "delete everything" path calls `clearImages()` directly instead of dynamically importing
  `idb-keyval`, which removed the build's `INEFFECTIVE_DYNAMIC_IMPORT` warning (H5)
- Knob pointer and fader fill alignment
- Stale cable endpoints: the cable canvas now invalidates its cached jack rects on any rack mutation,
  not only on resize and scroll, so removing or reordering a module no longer draws cables at the old
  positions
- An attenuverting knob no longer skips the param push, so a native module can render its value
  (`volt`'s readout)
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
- README module count corrected to 41 and given a "Deploy" section: the Pages URL scheme, the `--base`
  flag, the CI gate, and the browser floor (`baseline-widely-available`, with the Safari 16.4 caveat on
  the faceplate crop). `docs/system-architecture.md` gained the CSP directive list as shipped, a
  storage table with the `sessionStorage` row, and a deployment paragraph; `docs/code-standards.md`
  says the gate runs in CI and a red check blocks the merge (H3)
- Privacy scrub before publishing: local absolute paths under `plans/` replaced with `<repo>` and
  `<cablewerk-v2>`, and the account and plan tier removed from the CodeRabbit report header. The git
  history is untouched and stays an open question (S10)
- The CodeRabbit report carries a status column: 23 findings landed, 2 subsumed by the security phase,
  1 deferred, 11 needing no change
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

The release itself is not published: the first public push, the repo-settings checklist, the live
smoke test, the VoiceOver walkthrough of keyboard patching and the OpenAI image CORS check with a real
key all need a person at the keyboard. Each is written up in `plans/open-questions.md`, together with
the DSP-provenance question behind the MIT choice and whether the git history goes public as-is.

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
