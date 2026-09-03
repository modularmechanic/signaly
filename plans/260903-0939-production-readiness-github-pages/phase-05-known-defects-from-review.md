# Phase 05 — Known defects from the CodeRabbit pass

## Context links

- Source of truth for every item, with reproduction and verdict:
  `plans/reports/coderabbit-260903-0800-signaly-review.md` (rows #1–#25; the report's own "Worth fixing,
  ranked" list is the order below)
- Conventions for DSP tests: `docs/code-standards.md` "Testing conventions"; example `src/modules/vco/vco.dsp.test.ts`
- Signal contract: `CONTEXT.md` (audio ±5 V, pitch is the canonical 1 V/oct kind)

## Overview

Priority P1. Status: planned. Twenty-five findings were triaged as real on 2026-09-03 and none has landed.
This phase lands twenty of them; #16 and #17 belong to phase 02 (storage guard, fetch timeout); #22, #23 and
#24 are cosmetic and deferred (listed under Deferred below). Two are audible defects (a stuck note, a gate
output that never closes), two are correctness bugs in the shared noise source, one is a mis-placement on
patch import across rack widths, four are accessibility failures. The rest are small and are done while the
file is open. Each non-trivial fix leaves one test behind.

## Key insights

- `Lcg.next` multiplies past `Number.MAX_SAFE_INTEGER` before masking, so the low bits are zero and the
  sequence repeats every 16 403 samples. `Math.imul` restores 32-bit wraparound. `euklid.dsp.ts` has a private
  copy of the same arithmetic; fix both, and promote nothing (two copies, not three).
- `applySnapshot` places modules row by row with `addModule(mtype, rowIdx)`; when a row overflows the narrower
  target rack, `addModule` spills into the row beneath if it has room, else inserts one — and every later
  snapshot `rowIdx` now points at the wrong row. Pre-creating rows alone does **not** fix it: the spill would
  simply land in the pre-created next row and the index drift stays (critic pass, 2026-09-03). The fix is to
  address rows by **id** and to restore **bottom-up**: create every row first, remember its id, iterate the
  snapshot rows from last to first, and before each `addModule` resolve the index of that row id afresh.
  Rows below are already populated when a row overflows, so overflow either joins the row beneath (ADR 0002's
  own policy for a normal add) or gets a fresh spill row directly below — and no module ever lands in a
  later snapshot row's slot.
- `startJackDrag` is the one drag path without `pointercancel`; `Knob` and `Fader` already handle it.
- Four accessibility items are one-liners each except the module-browser focus trap.

## Requirements

- Functional: each row below fixed as its verdict describes; behaviour otherwise unchanged.
- Non-functional: one test per non-cosmetic fix; the full gate stays green; no file crosses 200 lines
  (the `reverb.dsp.ts` exception stands).

## Architecture

No structural change. Fixes are local to the file named in each row.

## Related code files

- Modify: `src/modules/kbd/kbd.native.ts`, `src/engine/dsp-prelude.ts` (+ new `dsp-prelude.test.ts` case),
  `src/modules/euklid/euklid.dsp.ts` (+ test), `src/modules/gate/gate.dsp.ts` (+ test),
  `src/hooks/patch-state.ts`, `src/engine/snapshot.ts` (+ test), `src/ui/atoms/mini-piano.tsx`,
  `src/hooks/formatters.ts` (+ test), `src/ui/atoms/switch.tsx`, `src/ui/templates/builder-workspace.tsx`,
  `src/modules/formant/formant.dsp.ts`, `src/modules/drum2/drum2.def.ts`,
  `src/modules/{tape,sdelay,ddelay}/*.dsp.ts`, `src/ui/organisms/module-browser.tsx`,
  `src/ui/templates/rack-workspace.tsx`, `src/modules/out/out.native.ts`
- Create: tests next to the files above where none exists
- Delete: none

## Implementation steps

Ranked; stop after step 9 if time is short — steps 10–14 are polish.

1. **#1 kbd stuck note** (`kbd.native.ts`): resolve key-up without the `typing()`/modifier filter; add a
   `blur` listener that calls `allOff`; remove it in `detach`. Test: keydown, then blur → `held` empty.
2. **#2/#3 Lcg overflow** (`dsp-prelude.ts`, `euklid.dsp.ts`): `Math.imul(this.s, 1103515245) + 12345`,
   masked as before. Test: 20 000 draws produce more than 19 000 distinct values.
3. **#4 GATE OUT** (`gate.dsp.ts`): `gout[i] = openNow || this.holdCtr > 0 ? 5 : 0`. Test: with RANGE at
   0 dB the gate output returns to 0 V after the input falls below threshold.
4. **#5 pointercancel** (`patch-state.ts`): register `pointercancel` alongside `pointerup`, sharing the
   cleanup; on cancel do the cleanup without connecting.
5. **#6 snapshot row drift** (`snapshot.ts`): after `clearRack()`, create rows until the count matches
   `s.rows.length` and capture `rowIds[i]` from the store. Iterate `s.rows` from the last index to the first;
   for each module, `const at = rows.findIndex((r) => r.id === rowIds[i])` on the **current** store state,
   then `addModule(ms.mtype, at)`. Keep module order within a row (iterate the row's uids in order). Test:
   a 2-row snapshot whose row 0 exceeds `rowWidthHp` (build it with modules whose `def.hp` sums past 120)
   restores every module; all of snapshot row 1's modules share one row; that row's index is greater than
   the index of the row holding snapshot row 0's first module; no module is missing from `modules`.
6. **#7 piano key names** (`mini-piano.tsx`): `aria-label` with the note name per key.
7. **#8 discrete formats** (`formatters.ts`): add `fKey`, `fChord`, `fShape` to `isIntFmt`. Test: arrow key
   on an `fShape` knob steps by exactly 1.
8. **#10/#11 register can reject** (`builder-workspace.tsx`): wrap `addModule` in `try/catch` exactly as
   `rack-workspace.tsx` does, returning the message as the error string; also add the request-generation
   counter (#20) so a stale registration cannot overwrite a newer preview.
9. **#12/#13 signal contract** (`formant.dsp.ts` clamp to ±5 V; `drum2.def.ts` `pitch_cv` kind `'p'`).
10. **#9 switch focus** (`switch.tsx`): after `setI`, focus the newly checked button.
11. **#14 sync LEDs** (`tape`, `sdelay`, `ddelay`): scan the block for any sample above 2.5 V instead of
    `clk[0]`.
12. **#15 euklid stale display**: post `{t:'step'}` when FILL/ROTATE change while stopped.
13. **#25 module browser**: Tab trap inside the dialog; `aria-activedescendant` on the list for the arrow-key
    highlight.
14. **#18 negative pitch** (`seq.parts.tsx`): keep the raw input string in local state and commit only when
    `valueAsNumber` is finite, so `-` can be typed on the way to `-1`.
15. **#19, #21**: announce "Row added"; delete the dead `?? 0.9` in `out.native.ts`.
16. Full gate; commit in two or three conventional commits (`fix:` audio defects, `fix:` a11y, `fix:` polish).

## Deferred (real, cosmetic, not scheduled)

- #22 `use-canvas.ts` does not observe DPR changes when both `width` and `height` are fixed — a canvas moved
  to a different-DPI display stays at the old backing size until it remounts.
- #23 `knob.tsx` recomputes the dominant drag axis on every move; a diagonal drag can flip mapping mid-gesture.
- #24 `module-header.tsx` `HEX` regex accepts 5- and 7-digit values; unreachable today (only `CAT_COLOR`
  constants reach it).

Phase 06 records these three in the CodeRabbit report's "landed" column as deferred.

## Todo list

- [ ] #1 kbd stuck note + test
- [ ] #2/#3 Lcg `Math.imul` + test
- [ ] #4 GATE OUT + test
- [ ] #5 pointercancel
- [ ] #6 snapshot rows created up front, placed by row id bottom-up + test
- [ ] #7 piano `aria-label`
- [ ] #8 `isIntFmt` + test
- [ ] #10/#11/#20 builder register guarded + generation counter
- [ ] #12/#13 formant clamp, drum2 kind
- [ ] #9, #14, #15, #25, #18, #19, #21 polish
- [ ] Gate green; commits

## Success criteria

- Each of the report's rows #1–#15, #18–#21 and #25 has a commit that references its number and, where the
  row was non-cosmetic, a test that fails on the old code. #16 and #17 land in phase 02; #22–#24 are recorded
  as deferred.
- `plans/reports/coderabbit-260903-0800-signaly-review.md` gets a "landed" column (phase 06 owns the edit).

## Risk assessment

- **Lcg change alters noise timbre**: it changes it from a 16 403-sample loop to real noise; that is the
  intent. Listen to NOISE, NOISELAB, SNH, WASP once.
- **Snapshot pre-creation leaves an empty row** if a snapshot row is entirely unknown mtypes: acceptable,
  and `removeRow` is one click; note it in the test.
- **Bottom-up restore changes where overflow lands** (it may join the row beneath instead of a fresh row):
  that is the same policy a manual add follows (ADR 0002), so it is consistent, and no module is lost.
- **Focus-follows-selection on `Switch`** may fight the roving `tabIndex` update order; do the focus in a
  `useEffect` keyed on the selected index.

## Security considerations

None new. `applySnapshot` input is already validated by `isRackSnapshot`; the row fix only changes placement.

## Next steps

Phase 06 marks the rows as landed in the CodeRabbit report and records the fixes in the changelog.
