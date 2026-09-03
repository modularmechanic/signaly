# CodeRabbit review — Signaly, 2026-09-03

Review ran. `coderabbit` CLI 0.7.5, already authenticated.
Gates at the time of the review: `npm run typecheck` clean, `npm run lint` clean, `npx vitest run` 41 files / 228 tests
passing, `npx vite build` succeeds. This lane changed no source file.

## Commands

The repo has no remote and only `main`, so the CLI could not infer a base. Two attempts failed first:

```
coderabbit review --agent --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b
  -> Error: Unable to determine base branch. Pass one explicitly with --base <branch>

coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b
  -> Error: Too many files! This PR contains 248 files, which is 98 over the limit of 150.
```

`--base main --base-commit <root commit>` is the combination that works — `--base` satisfies the branch-info
stage, `--base-commit` makes the whole history since the root commit the diff. A review is capped at 150
files, so the review was split by directory. The eight commands actually run, in order:

```
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/engine
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/features
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/hooks
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/state
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/storage
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/ui
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir src/modules
coderabbit review --agent --base main --base-commit 3792acb7fb8e83094106891d02b0c16c6dc7bd7b --dir tests
```

Each run also warned that with no git remote the review falls back to the CLI's own allowance. All eight
exited 0.

Not covered by any pass: `src/core/types.ts`, `src/app.tsx`, `src/main.tsx`, `src/styles/*.css` (11 files).
Re-run with `--dir src/core` and `--dir src/styles` if that matters; the two loose `.tsx` files at the `src`
root have no `--dir` of their own.

## Raw counts

204 files reviewed, **39 findings: 15 major, 24 minor**. CodeRabbit emits no "critical" tier here.

| Pass | Files | Major | Minor |
|---|---|---|---|
| `src/engine` | 12 | 2 | 0 |
| `src/features` | 23 | 1 | 1 |
| `src/hooks` | 6 | 0 | 3 |
| `src/state` | 3 | 2 | 0 |
| `src/storage` | 7 | 3 | 2 |
| `src/ui` | 51 | 5 | 8 |
| `src/modules` | 100 | 2 | 10 |
| `tests` | 2 | 0 | 0 |
| **Total** | **204** | **15** | **24** |

## Triage

Verdicts: **Real** · **Already-fixed** · **Deliberate** (contradicts a documented simplification) · **False-positive**.

| # | file:line | Finding | Verdict | Reason | Status |
|---|---|---|---|---|---|
| 1 | `src/modules/kbd/kbd.native.ts:79` | keyup goes through the same `typing()`/modifier filter as keydown; no `blur` handler | **Real** | Press a key, then click a text field or hold Ctrl before releasing: `noteFor` returns `undefined`, `trigOff` never runs, the note and its gate stay held. Alt-tab with a key down does the same. | **landed** |
| 2 | `src/engine/dsp-prelude.ts:181` | `Lcg.next` needs `Math.imul` | **Real** | `this.s * 1103515245` reaches ~2.4e18, past `MAX_SAFE_INTEGER`, so the low bits are gone before the mask. Measured: the low 4 bits are 0 from the second draw on and the sequence repeats after 16403 values (~0.34 s at 48 kHz) instead of 2^31. Affects `noise`, `noiselab`, `snh`, `wasp`. No test covers `Lcg`. | **landed** |
| 3 | `src/modules/euklid/euklid.dsp.ts:22` | same LCG overflow in the private `rnd()` | **Real** | Identical arithmetic, identical degeneration. Same one-line fix; confirms #2 is systemic, not a one-off. | **landed** |
| 4 | `src/modules/gate/gate.dsp.ts:64` | `gout[i] = this.gain > 0.5 ? 5 : 0` reads the envelope, not the gate decision | **Real** | `range` is a knob spanning −90..0 dB. At RANGE above ≈−6 dB, `rangeGain >= 0.5`, so GATE OUT sits at 5 V permanently and never falls. It also lags the real gate by the ATTACK time. `openNow \|\| this.holdCtr > 0` is already computed one line up. | **landed** |
| 5 | `src/hooks/patch-state.ts:173` | `startJackDrag` binds `pointermove`/`pointerup` but not `pointercancel` | **Real** | A cancelled pointer (touch taken over for scrolling, context menu) never runs `up`: `drag` stays non-null, the `.hot` class sticks, every jack keeps the `.compat` glow, and both window listeners leak. `Knob` and `Fader` both already handle `onPointerCancel` — this is the one drag path that does not. | **landed** |
| 6 | `src/engine/snapshot.ts:122` | rows must exist before `addModule` places into them | **Real, wrong reason** | The stated premise is false: `if (rowIdx > 0) addRow()` does create empty rows. The real defect is index drift. Restoring a patch saved on a 240 HP rack into a 120 HP rack makes row 0 overflow, `addModule` calls `insertRow(at + 1)`, and every later `rowIdx` now points at that spill row — so snapshot row 1's modules join row 0's overflow while the freshly appended row stays empty. The suggested fix (pre-create all rows) does address it. | **landed** |
| 7 | `src/ui/atoms/mini-piano.tsx:23` | 12 key `<button>`s with no text and no `aria-label` | **Real** | Their accessible name is empty — a WCAG 4.1.2 failure. Used live by `piano-display` for the `kbd` module. | **landed** |
| 8 | `src/hooks/formatters.ts:29` | `isIntFmt` omits `fKey`, `fChord`, `fShape` | **Real** | `fRate` is already in the list and is the same kind of table index, so this is an oversight rather than a choice. On `arp`'s SHAPE knob (range 3) an arrow key steps `range/100 = 0.03`: 17 presses before the value crosses 0.5 and the display changes. `aria-valuenow` also reports fractions on a discrete control. The DSP rounds, so audio is fine — this is keyboard reachability only. | **landed** |
| 9 | `src/ui/atoms/switch.tsx:29` | arrow keys change selection but do not move DOM focus | **Real** | Roving `tabIndex` is implemented correctly, but after `setI` the focused button becomes `tabIndex={-1}` while the checked one gets `0`. APG requires focus to follow selection in a radiogroup; screen readers announce nothing on arrow. | **landed** |
| 10 | `src/ui/organisms/module-builder-chat.tsx:37` | `send` has `try/finally` with no `catch` | **Real** | `generateModule` cannot reject, but `onModule` (`BuilderWorkspace.register`) calls `addModule` unguarded, and `rack-workspace.tsx:101` already wraps the same call because "a worklet whose processor never registered throws on construction". A throw there escapes as an unhandled rejection from `void send(ask)` and the chat shows nothing. | **landed** |
| 11 | `src/ui/organisms/dsp-code-panel.tsx:29` | `verify`/`save` have no `catch` | **Real (half)** | `save` shares #10's root — `onRegister` can reject. `verify` cannot: `transpileDsp` returns a result and `verifyDsp` catches everything. Fix `save` only. | **landed** |
| 12 | `src/modules/formant/formant.dsp.ts:43` | output clamp and resonance compensation | **Real (the clamp)** | `clamp(y * 7, -10, 10)` lets FORMANT emit ±10 V against the documented ±5 V audio convention (CONTEXT.md, "audio swings ±5"); every other module respects it. The suggested `* k` resonance compensation is a taste call — verify by ear. | **landed** |
| 13 | `src/modules/drum2/drum2.def.ts:23` | `pitch_cv` declared `kind: 'c'` | **Real** | `drum2.dsp.ts:95` does `Math.pow(2, p.pitch + pitchCv)` — that is 1 V/oct, and the jack's own label is `V/OCT`. CONTEXT.md makes **pitch** the canonical kind for 1 V/oct. Nothing attenuates this jack, so `'c'` → `'p'` is safe; `module-contract-sweep` does not check kind against usage. | **landed** |
| 14 | `src/modules/tape/tape.dsp.ts:56`, `src/modules/sdelay/sdelay.dsp.ts:91`, `src/modules/ddelay/ddelay.dsp.ts:56` | sync LED derived from `clk[0]` alone | **Real** | One sample per 128 decides the LED, so any pulse that starts mid-block is invisible. Cosmetic, but three copies of the same mistake. | **landed** |
| 15 | `src/modules/euklid/euklid.dsp.ts:56` | `{t:'step'}` only posts when the step index changes | **Real** | Turning FILL or ROTATE while the clock is stopped leaves the step display showing the old pattern. | **landed** |
| 16 | `src/storage/local-json.ts:23` | `readJson` returns `env.data` unchecked | **Real, narrow** | `{"v":1,"data":null}` under `signaly.patches.v1` makes `read()` call `.filter` on `null` — verified TypeError, which breaks `PatchMenu`'s `useState` initialiser. That contradicts the stated contract ("malformed payloads fall back silently"). Only reachable via corrupted or hand-edited storage; the existing test covers a non-envelope array but not this. One `Array.isArray` guard in the two `read()` helpers. | **landed** |
| 17 | `src/features/llm/providers/http.ts:19` | `fetch` has no `AbortSignal` / timeout | **Real** | A provider that never answers leaves `send`'s `pending` true forever — Send stays disabled, no error, no cancel, reload is the only exit. | **phase 02** |
| 18 | `src/modules/seq/seq.parts.tsx:63` | `valueAsNumber \|\| 0` on the pitch input | **Real, minor** | No NaN leaks (`\|\| 0` catches it), but typing `-` snaps the controlled value to 0, so a negative pitch cannot be typed — only dialled with the spinner. | **landed** |
| 19 | `src/ui/templates/rack-workspace.tsx:27` | `announce` says nothing when a row is added | **Real, minor** | `+ Row` bumps `revision` but matches no branch, so the live region stays silent. | **landed** |
| 20 | `src/ui/templates/builder-workspace.tsx:48` | no request-generation guard around `register` | **Real, narrow** | `ModuleBuilderChat` guards on `pending`, but `UserModuleLibrary`'s `onLoad` calls `void register(um)` with no guard. Two overlapping registrations can land out of order, leaving `draft` from one and `preview` from the other, and attribute the error string to the wrong request. Effect cleanup does tear down superseded previews, so nothing leaks. | **landed** |
| 21 | `src/modules/out/out.native.ts:38` | `m.vals.level ?? 0.9` vs the def's `initial: 0.5` | **Real, dead** | `addModule` seeds `m.vals` before `makeNode`, so the fallback never fires. Still a stale constant left behind by commit `c3d1cdf`, and the wrong one to resurrect given OUT is the only sink. One-character cleanup. | **landed** |
| 22 | `src/hooks/use-canvas.ts:33` | DPR changes are not observed | **Real, cosmetic** | When both `width` and `height` are given no `ResizeObserver` is attached at all, so moving the window to a different-DPI display leaves that canvas at the old backing size until it remounts. | **landed** |
| 23 | `src/ui/atoms/knob.tsx:77` | dominant drag axis recomputed every move | **Real, cosmetic** | A diagonal drag flips between the x and y mapping mid-gesture. Latching on the first move past a slop radius is the standard fix. | **landed** |
| 24 | `src/ui/molecules/module-header.tsx:3` | `HEX` accepts 5 and 7 hex digits | **Real, cosmetic** | The regex exists precisely as a validation boundary, and it lets through two lengths CSS rejects. Unreachable today: the only caller passes a `CAT_COLOR` constant. | **deferred** |
| 25 | `src/ui/organisms/module-browser.tsx:36` | Escape handling, focus restore, focus trap, `aria-selected` | **Real, narrowed** | Two of the three claims are already handled elsewhere: `rack-workspace.tsx:77` closes the browser on Escape from anywhere, and `opener.current?.focus()` restores focus on close. What is genuinely missing is a Tab trap inside the dialog and `aria-selected`/`aria-activedescendant` for the arrow-key highlight. | **landed** |
| 26 | `src/storage/api-key-store.ts:35` | do not persist API keys to `localStorage`; use a backend | **Deliberate** | This is the whole BYOK design. README: "keys live in `localStorage`. A pure client-side app cannot hide a key from a script running on the same origin" — mitigated by the CSP and by never logging the key. "No backend" is listed under *Deliberately absent*. | **phase 02** |
| 27 | `src/storage/local-json.ts:38` | `writeJson` swallows `setItem` failures | **Deliberate, with a real edge** | system-architecture.md states the behaviour outright ("writes swallow quota/private-mode failures"). The one place it bites is `savePatch`, which reports "Saved X" after a quota failure. If that matters, return a boolean rather than unwinding the design. | **no change** |
| 28 | `src/modules/wasp/wasp.dsp.ts:30` | apply `this.p.cv` to the frequency CV | **False-positive** | `cv` is `attenuates: 'cv'`. The engine inserts a `GainNode` ahead of the input (`installCvAttenuverters`), and system-architecture.md says "the knob value never reaches the DSP" / "never scale that input in DSP". Following this would double-apply the attenuation. | **no change** |
| 29 | `src/features/faceplate/image-crop.ts:26` | reject crop rects that fall outside the bitmap | **False-positive, harmful** | `cropPreset`'s own comment is "fit letterboxes (the rect covers the image)" — in `fit` mode `sx`/`sy` are deliberately negative and `sx+sw` exceeds the width. `drawImage` clips and letterboxes, which is the intent. The suggested guard would break `fit`. | **no change** |
| 30 | `src/ui/organisms/patch-menu.tsx:16` | replace the shared notice with local feedback state | **False-positive** | The code already does exactly that: `const [feedback, note] = useState('')`, with a comment on the line above reading "Own line, not the rack's global notice". CodeRabbit read `note` as the global setter. | **no change** |
| 31 | `src/ui/organisms/module-builder-chat.tsx:67` | disable retry while a request is pending | **False-positive** | `send` opens with `if (!ask \|\| pending) return`. A retry click while pending is already a no-op; only the button's disabled styling is missing. | **no change** |
| 32 | `src/ui/organisms/faceplate-editor.tsx:113` | `generate` needs a `catch` like `apply` | **False-positive** | `generateFaceplateImage` wraps its provider call in `try/catch` and returns `{ error }`; `generateFaceplate` adds only synchronous guards. Nothing on that path can reject. | **no change** |
| 33 | `src/ui/atoms/env-display.tsx:40` | `ctx.fillStyle = c + '22'` should use `globalAlpha` | **False-positive** | The only caller passes `CAT_COLOR[m.def.cat]`, and all twelve are 6-digit hex, so the concatenation is valid 8-digit hex. Stylistically fragile, functionally correct. | **no change** |
| 34 | `src/state/rack-store.ts:104` | `placeModule` should check that `uid` exists | **False-positive** | Its one production caller, `moveModule` (`rack.ts:204`), already does `if (!m \|\| !target) return false`. Unreachable defensive duplication. | **no change** |
| 35 | `src/state/rack-store.ts:44` | `addModuleInstance` should validate `rowIdx` and reject duplicate uids | **False-positive** | Its one production caller, `addModule` (`rack.ts:102`), derives `rowIdx` from `fits()`/`insertRow()` and takes `uid` from `nextUid++`. Neither condition is reachable. | **no change** |
| 36 | `src/storage/user-module-store.ts:43` | reject an empty `slug` in `saveUserModule` | **False-positive** | The only caller is `dsp-code-panel.tsx:55`, passing a `UserModule` whose slug already went through `validateSlug`. | **no change** |
| 37 | `src/storage/api-key-store.ts:43` | `clearKeys` should keep `models` | **False-positive** | Its only caller is the "Delete everything, permanently" button, which calls `localStorage.clear()` two lines later. Preserving `models` there achieves nothing. | **no change** |

Two findings from the `src/ui` pass duplicate rows above and are folded in (the `dsp-code-panel` and
`module-builder-chat` error-handling pair, #10 and #11). The `tests` pass returned zero findings.

Tally: 25 real (5 of them cosmetic or dead), 2 against documented decisions, 10 false positives, 2 folded.

## Status column, 2026-09-03

Set against the shipped tree after the production-readiness plan (`plans/260903-0939-production-readiness-github-pages/`).

| status | count | rows |
|---|---|---|
| **landed** | 23 | 1–16, 18–23, 25 |
| **phase 02** | 2 | 17 (timeout landed, then raised to 120 s with a distinct deadline message), 26 (keys now default to `sessionStorage` with a "remember in this browser" opt-in) |
| **deferred** | 1 | 24 — the `HEX` regex is unreachable today; its only caller passes a `CAT_COLOR` constant |
| **no change** | 11 | 27 (documented: writes swallow quota failures), 28–37 (false positives) |

## Worth fixing, ranked

1. **`kbd` stuck note** (#1) — the only finding with an audible, easily reproduced failure: a note and its gate
   held forever. `onUp` should resolve the key without the `typing()`/modifier filter, plus a `blur` handler
   calling `allOff` and a matching `removeEventListener` in `detach`.
2. **`Lcg` 32-bit arithmetic** (#2, #3) — `Math.imul` in `dsp-prelude.ts` and in `euklid.dsp.ts`. Two one-line
   changes turn a 16403-sample loop back into a real noise source across four modules. Leave one assertion
   behind: draw 20 000 values and check the distinct count.
3. **`gate` GATE OUT** (#4) — reuse `openNow || this.holdCtr > 0`. One line; today the output is stuck at 5 V
   for any RANGE above about −6 dB.
4. **`pointercancel` on jack drag** (#5) — three lines, and it matches what `Knob` and `Fader` already do.
5. **`applySnapshot` row drift** (#6) — pre-create every row before placing modules. Reachable whenever a
   patch crosses from a wide rack to a narrow one, which export/import makes ordinary.
6. **Two a11y one-liners** (#7, #8) — `aria-label` on the piano keys, and `fChord`/`fShape`/`fKey` added to
   `isIntFmt`. Both are single-line and both fix controls that are currently unusable by keyboard or screen
   reader.
7. **`register` can reject** (#10, #11) — wrap `addModule` in `builder-workspace.tsx` the way
   `rack-workspace.tsx:101` already wraps it, rather than adding `catch` blocks at each of the two call sites.
8. **Signal-kind and range corrections** (#12, #13) — `drum2`'s `pitch_cv` to `'p'`, and bring FORMANT's clamp
   to ±5 V. Both are contract violations against CONTEXT.md rather than taste.

Below that line: the three `clk[0]` LEDs (#14), euklid's stale display (#15), the `readJson` array guard (#16),
and a fetch timeout (#17) are all small and worth doing when the file is open anyway. Everything from #18 down
is polish.

Two things this review did not find and would not: no finding touched `dsp-transpile.ts`'s `FORBIDDEN` regex,
`reverb.dsp.ts`'s length, `ModuleInstance.ext`, the textarea editor, or the absence of barrels and streaming —
the documented simplifications came through clean.
