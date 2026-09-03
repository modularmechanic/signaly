# Phase 04 — Modules batch C: seq/ctrl, drums, meters, output (11)

## Context links
- Plan: [plan.md](plan.md) · Foundation: [phase-01](phase-01-foundation-engine-state-storage.md)
- Reports: [scout-00](scout/scout-00-main-agent-source-analysis.md) §"Custom-UI modules" · [scout-01](scout/scout-01-reusable-code-map.md) §"Module complexity"
- Source (read-only): `<cablewerk-v2>/src/modules/<id>/`

## Parallelization Info
- **Group:** 2
- **Runs with:** 02, 03, 05, 07
- **Waits for:** 01

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- The awkward batch: 6 worklet, 5 native, one module with custom React parts and a serializer (`seq`), and every module that needs a `display`. Everything else in batches A and B is a plain def+dsp copy; this phase carries all the exceptions.

## Key Insights
- Native modules here: `kbd` (53 L, keyboard events), `scope` (44 L, AnalyserNode + canvas), `volt` (33 L), `out` (190 L + separable `out.analysis.ts`), `voct` (46 L) — scout-01.
- `seq` is the only module in the whole 40 with `.parts.tsx` (161 L) and `.serialize.ts` (90 L). The source stores 64 banks × 8 steps; **v1 keeps 1 bank × 8 steps** — 64 banks is speculative (scout-01 unresolved Q5).
- `seq.parts.tsx` depends on the source's `module-part-sync.ts` (`usePartSync`/`bumpParts`). Replace with a local `useReducer` bump in the parts component — one line, no shared module (scout-01 unresolved Q2).
- `drum2.preview.ts` is droppable (scout-01). `out.analysis.ts` is separable and worth keeping as its own file.
- `display` values come from the source's `panel-runtime-model.ts` dispatch (L904–927): `arp`/`clock`/`volt`/`voct` → `'text'`, `kbd` → `'piano'`, `scope` → `'scope'`, `out` → `'meter'`, `euklid`/`seq` → `'steps'`.

## Requirements
- `seq` ships `def` + `dsp` + `serialize` + `parts.tsx`. Its parts component receives `{ m: ModuleInstance }` and uses only phase-01 hooks (`usePortSend`, `useWorkletFeed`) plus the phase-01 `step-grid` atom.
- `seq.serialize.validate(o)` must reject malformed `ext` blobs — it runs on untrusted imported patch JSON.
- Native modules populate `m.jacks` and `m.natives`; `scope`/`out` expose their `AnalyserNode` on `m.ext` so phase 05's canvas molecules can read it without touching the graph.
- No per-frame value goes through React state (researcher-02 §2) — displays read from `m.ext` inside the phase-01 `render-bus` rAF pump.

## Architecture
Serialize spec (`seq` only):
```ts
// src/modules/seq/seq.serialize.ts
import type { SerializeSpec } from '../../engine/types';
type SeqExt = { steps: { pitch: number; gate: 0 | 1 }[] };   // length 8, one bank
export const serialize: SerializeSpec = {
  save: (m) => ({ steps: (m.ext.seq as SeqExt).steps }),
  load: (m, o) => { if (serialize.validate!(o)) m.ext.seq = o as SeqExt; },
  validate: (o) => !!o && typeof o === 'object' && Array.isArray((o as SeqExt).steps)
    && (o as SeqExt).steps.length === 8
    && (o as SeqExt).steps.every(s => Number.isFinite(s.pitch) && (s.gate === 0 || s.gate === 1)),
};
```
Parts component (`seq` only):
```tsx
// src/modules/seq/seq.parts.tsx
export function parts({ m }: { m: ModuleInstance }) {
  const [, bump] = useReducer((n: number) => n + 1, 0);   // replaces module-part-sync
  const send = usePortSend(m);
  const active = useWorkletFeed(m, 'step');               // current step index from the DSP
  return <StepGrid steps={8} active={active} value={…} onToggle={(i) => { …; send({ t: 'step', i, … }); bump(); }} />;
}
```
`registry.ts` (phase 01) already globs `./*/*.parts.tsx` into `spec.parts` — no registry edit needed.

## Module table
| id | route | source files | display | notes |
|---|---|---|---|---|
| clock | worklet | def 45 L, dsp 125 L | `text` | tempo readout; drives `ClockSync` consumers |
| clockdiv | worklet | def 22, dsp 70 | — | — |
| euklid | worklet | def 48, dsp 114 | `steps` | source `front-panel.ts` is 650 L of step-ring coords — port only the knob/switch/jack/display nodes; the 16 ring LEDs belong to the `steps` display part, not the panel |
| seq | worklet | def 36, dsp 93, serialize 90, parts 161 | `steps` | reduce 64 banks → 1; replace `usePartSync` |
| arp | worklet | def 73, dsp 146 | `text` | — |
| kbd | **native** | def 26, native 53 | `piano` | keyboard events; pairs with phase-01 `mini-piano` atom |
| drum2 | worklet | def 42, dsp 225 | — | **drop** `drum2.preview.ts` |
| scope | **native** | def 34, native 44 | `scope` | AnalyserNode; expose on `m.ext.analyser` |
| volt | **native** | def 22, native 33 | `text` | simplest native in the project |
| out | **native** | def 35, native 190, analysis 190 | `meter` | keep `out.analysis.ts`; **drop** `out.analysis.test.ts` and `out.panel.test.tsx` (panel test targets the dropped system) — rewrite the analysis test fresh |
| voct | **native** | def 28, native 46 | `text` | octave shifter |

## Related code files
**Create:**
- `src/modules/{clock,clockdiv,euklid,arp,drum2}/<id>.{def,dsp}.ts` (10 files)
- `src/modules/seq/seq.{def,dsp}.ts`, `seq.serialize.ts`, `seq.parts.tsx` (4 files)
- `src/modules/{kbd,scope,volt,out,voct}/<id>.{def,native}.ts` (10 files)
- `src/modules/out/out-analysis.ts`
- Tests: `src/modules/seq/seq.serialize.test.ts`, `src/modules/clock/clock.dsp.test.ts`, `src/modules/out/out-analysis.test.ts`, `src/modules/euklid/euklid.dsp.test.ts`

**Port FROM:** `<cablewerk-v2>/src/modules/<id>/`, plus `src/modules/out/out.analysis.ts`.
**Do not port:** `drum2/drum2.preview.ts`, `out/out.panel.test.tsx`, `out/out.analysis.test.ts`. **Do port** each `*.front-panel.ts` → `<id>.panel.ts` (phase-02 recipe step 8). `seq.panel.ts` keeps one 8-step `display` node; step-grid geometry lives in the display part. +1h for this batch. <!-- Updated: Validation Session 1 - panel port -->

## File Ownership
Exclusively owns `src/modules/clock/`, `clockdiv/`, `euklid/`, `seq/`, `arp/`, `kbd/`, `drum2/`, `scope/`, `volt/`, `out/`, `voct/`. Nothing outside `src/modules/`. Does not touch `registry.ts`, `panel-layout.ts`, or the phase-01 atoms it imports.

## Implementation Steps
1. Port `volt` (33 L native) first to validate `NativeSpec` against phase 01's types, then `voct` and `mult`-shaped natives.
2. Port `scope` and `out`. For both, set `m.ext.analyser = analyserNode` in `native.audio` so display molecules never reach into the graph. Split `out-analysis.ts` out and write a fresh unit test for it (the source test targets removed APIs).
3. Port `kbd` native. Its keyboard-event handling must attach/detach in `audio`/`dispose`, not at module scope.
4. Port the worklet six: `clock`, `clockdiv`, `arp`, `euklid`, `drum2`, `seq` — following the phase-02 port recipe.
5. `seq`: cut the def and DSP down to 1 bank × 8 steps. Remove any bank-select knob/switch from the def and the matching branches from the DSP.
6. Write `seq.serialize.ts` per the shape above, then `seq.parts.tsx` using `useReducer` instead of `usePartSync` and phase-01's `step-grid` atom.
7. Set `display` on `clock`, `euklid`, `seq`, `arp`, `kbd`, `scope`, `volt`, `out`, `voct` per the table.
8. Tests: `seq.serialize.test.ts` round-trips and rejects four malformed blobs (wrong length, non-finite pitch, gate 2, null); `clock.dsp.test.ts` asserts BPM → expected pulse period; `euklid.dsp.test.ts` asserts a known (steps, fills) pair produces the canonical Euclidean pattern; `out-analysis.test.ts` covers the level maths.

## Todo list
- [ ] Natives: volt, voct, scope, out (+ `out-analysis.ts` + test), kbd
- [ ] Worklets: clock (+test), clockdiv, arp, euklid (+test), drum2
- [ ] `seq` def+dsp reduced to 1 bank × 8 steps
- [ ] `seq.serialize.ts` + test
- [ ] `seq.parts.tsx` with `useReducer` bump
- [ ] `display` field set on the nine modules that need it

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run` pass.
- Contract sweep passes for all 11; `seq` is the only module in the repo with `parts` or `serialize` in its `ModuleSpec`.
- `seq.serialize.validate` rejects all four malformed fixtures.
- No `module-part-sync.ts` equivalent exists anywhere.
- `scope`/`out` expose `m.ext.analyser`; no display code calls `getAudioContext()` directly.

## Conflict Prevention
Disjoint module folders from 02 and 03. `seq.parts.tsx` imports the `step-grid` atom from phase 01 (already landed) — it must not import anything from phase 05's `ui/molecules`, which is being written concurrently. If a `seq` display needs something phase 05 owns, inline it locally and raise it in phase 09.

## Risk Assessment
- **`seq` bank reduction** (medium): the DSP may index a bank offset in several places. Grep the ported DSP for the bank variable and remove every use, not just the knob.
- **`out` is the audio sink** (high): if `out.native.audio` fails to connect to `ctx.destination`, the entire app is silent with no error. Add an explicit assertion in the `out` port review.
- **`kbd` global listeners** (medium): attaching `keydown` at module scope leaks across module instances and fires while the user types in the phase-08 chat box. Attach in `audio`, remove in `dispose`, and ignore events when `document.activeElement` is an input/textarea.
- **`euklid`/`seq` display coupling** (low): `display: 'steps'` is rendered generically by phase 05/06. If the generic step display cannot show what these modules need, `seq` already has `parts.tsx` as the escape hatch; do not add a second one for `euklid` without raising it.

## Security Considerations
- `seq.serialize.load` is the only place in the built-in catalog that consumes untrusted imported patch JSON. `validate` must run before `load` writes anything to `m.ext`, must bound the array length, and must never `JSON.parse` or eval its input.
- `kbd`'s global key listener must not capture keystrokes while an input, textarea, or contenteditable has focus — otherwise it reads the user's typing in the phase-08 chat and BYOK key fields.

## Next steps
Feeds phase 06 (rack renders these) and phase 09 (catalog count test asserts exactly 40 ids).
