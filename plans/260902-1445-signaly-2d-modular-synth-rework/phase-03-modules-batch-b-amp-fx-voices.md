# Phase 03 — Modules batch B: amp/mix, FX, voices (14)

## Context links
- Plan: [plan.md](plan.md) · Foundation: [phase-01](phase-01-foundation-engine-state-storage.md)
- Reports: [scout-00](scout/scout-00-main-agent-source-analysis.md) §"Module contract" · [scout-01](scout/scout-01-reusable-code-map.md)
- Source (read-only): `<cablewerk-v2>/src/modules/<id>/`

## Parallelization Info
- **Group:** 2
- **Runs with:** 02, 04, 05, 07
- **Waits for:** 01

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- Port 14 modules: 12 worklet, 2 native (`mix`, `mult`). Contains the largest DSP file in the project (`reverb.dsp.ts`, 438 L) and the delay family that depends on `DL` + `ClockSync` + `SYNC_DIV`.

## Key Insights
- `mix` and `mult` are **native** — they build a Web Audio graph (`native.audio(m)`) instead of registering a worklet processor. Their source `native.ts` files are 40 L and 21 L, both trivial (scout-01 complexity table).
- `ddelay` is the reference for prelude clock-sync usage: `DL` delay line + `ClockSync` + the 10-entry `SYNC_DIV` table with index 0 = FREE (scout-01 §"Base class contract").
- `reverb.dsp.ts` at 438 L is over the 200-line house limit but is a single cohesive algorithm — split only if a clean seam exists (e.g. an allpass/comb bank), otherwise keep it whole and note the exception.
- No module in this batch has `.parts.tsx` or `.serialize.ts` in the source. No custom React needed.
- `front-panel.ts` files ARE ported as compact `<id>.panel.ts` per the phase-02 recipe step 8 (worklet and native alike). <!-- Updated: Validation Session 1 - panel insight -->

## Requirements
- Worklet modules: `def.worklet` set, `def.native` unset, and vice versa. Never both.
- Native modules must populate `m.jacks.in` / `m.jacks.out` and push every created node onto `m.natives` so `rack.teardownModule` can dispose them.
- `mix`'s `patchState` hook (switched-jack / normalled-input behaviour) is kept — that is real mixer semantics, not decoration.
- No allocation inside `process()`; `DL` buffers pre-allocated in the constructor.

## Architecture
Worklet modules follow the phase-02 port recipe verbatim (steps 1–9 there). Native modules add one file and one rule:

```ts
// src/modules/mix/mix.native.ts
import type { ModuleInstance, NativeSpec } from '../../engine/types';
export const native: NativeSpec = {
  audio(m) { /* build GainNodes etc.; fill m.jacks.in/out; push nodes onto m.natives */ },
  param(m, id, v) { /* map knob id -> AudioParam */ },
  patchState(m, dir, jack, connected) { /* normalled-input behaviour */ },
  dispose(m) { /* only if a node needs explicit teardown beyond disconnect */ },
};
```
`node-factory.makeNode` calls `native.audio(m)` when `def.native` is set, then runs `installCvAttenuverters` for both routes — so a native module can still declare `attenuates` knobs and get the same bipolar CV gain node.

## Module table
| id | route | source files | notes |
|---|---|---|---|
| vca | worklet | def 33 L, dsp 43 L | — |
| mix | **native** | def 28, native 40 | keep `patchState` normalling |
| mult | **native** | def 23, native 21 | simplest native; pure fan-out |
| comp | worklet | def 36, dsp 123 | `display: 'meter'` (gain reduction) |
| gate | worklet | def 48, dsp 126 | noise gate, not a gate signal |
| ddelay | worklet | def 68, dsp 71 | `DL` + `ClockSync` + `SYNC_DIV` reference |
| sdelay | worklet | def 56, dsp 147 | — |
| reverb | worklet | def 75, dsp 438 | largest DSP; source has `reverb.panel-scene.test.tsx` — do not port it (tests the dropped panel system) |
| chorus | worklet | def 42, dsp 59 | — |
| flanger | worklet | def 50, dsp 63 | — |
| crush | worklet | def 40, dsp 54 | — |
| dist | worklet | def 32, dsp 52 | — |
| tape | worklet | def 55, dsp 101 | — |
| monov | worklet | def 50, dsp 125 | composite voice (osc+filter+env in one processor) |

## Related code files
**Create:**
- `src/modules/{vca,comp,gate,ddelay,sdelay,reverb,chorus,flanger,crush,dist,tape,monov}/<id>.{def,dsp}.ts` (24 files)
- `src/modules/mix/mix.{def,native}.ts`, `src/modules/mult/mult.{def,native}.ts` (4 files)
- Tests: `src/modules/ddelay/ddelay.dsp.test.ts`, `src/modules/vca/vca.dsp.test.ts`, `src/modules/mult/mult.native.test.ts`

**Port FROM:** `<cablewerk-v2>/src/modules/<id>/` for each id.
**Do not port:** `reverb/reverb.panel-scene.test.tsx`. **Do port** each `*.front-panel.ts` → `<id>.panel.ts` (phase-02 recipe step 8); +1h for this batch. <!-- Updated: Validation Session 1 - panel port -->
**Modify / delete:** none.

## File Ownership
Exclusively owns `src/modules/vca/`, `mix/`, `mult/`, `comp/`, `gate/`, `ddelay/`, `sdelay/`, `reverb/`, `chorus/`, `flanger/`, `crush/`, `dist/`, `tape/`, `monov/`. Nothing outside `src/modules/`. Does not touch `registry.ts` or `panel-layout.ts`.

## Implementation Steps
1. Port `mult` first — 21 L of native code, the fastest way to validate the `NativeSpec` contract against phase 01's `engine/types.ts`.
2. Port `mix`, keeping `patchState`. Confirm phase 01's `rack.notifyPatchState` calls it on both connect and disconnect.
3. Port `vca` (simplest worklet in this batch), typecheck, then batch the rest.
4. Port the FX chain: `ddelay` → `sdelay` → `chorus` → `flanger` → `crush` → `dist` → `tape`.
5. Port `reverb`. If it exceeds 200 lines after docblock stripping (expect ~300), leave it whole and add a one-line comment naming the exception rather than inventing an abstraction to split it.
6. Port `comp` (set `display: 'meter'`), `gate`, `monov`.
7. Tests: `ddelay.dsp.test.ts` asserts a known delay time produces the impulse at the expected sample offset and that `SYNC_DIV[0]` is FREE mode; `vca.dsp.test.ts` asserts gain 0 silences and gain max passes unity; `mult.native.test.ts` asserts one input fans out to every declared output jack.

## Todo list
- [ ] `mult` native + test
- [ ] `mix` native with `patchState`
- [ ] `vca` worklet + test
- [ ] FX: ddelay (+test), sdelay, chorus, flanger, crush, dist, tape
- [ ] `reverb`
- [ ] `comp`, `gate`, `monov`

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run` pass.
- Contract sweep passes for all 14: exactly one of `worklet`/`native` set, native ids have a matching `native.ts`, no duplicate ids.
- `mix` and `mult` register no worklet processor (nothing in `worklet-entry`'s glob for those folders).
- Every file under 200 lines except `reverb.dsp.ts`, which is documented as the single deliberate exception.

## Conflict Prevention
Disjoint module folders from 02 and 04. No shared file edited — registry and worklet-entry resolve by glob. Do not add helpers to `engine/dsp-prelude.ts` (phase 01 owns it); duplicate locally and flag in phase 09.

## Risk Assessment
- **Native teardown leak** (high): a native module that forgets `m.natives.push(node)` leaves audio nodes running after `removeModule`. Assert in `mult.native.test.ts` that `m.natives.length` matches the node count.
- **`reverb` size** (medium): 438 L is the one genuine house-rule breach. A forced split into `reverb-allpass.ts` + `reverb-comb.ts` would add indirection to a single algorithm — accept the exception, do not manufacture modules.
- **`DL` semantics** (medium): `DL.push()` flushes denormals and `read(d)` is fractional. A port that swaps read/write order changes the delay by one sample. The `ddelay` test guards this.

## Security Considerations
Same as phase 02 — first-party build-time DSP, no sandbox concerns. The real risk is runaway feedback: `ddelay`, `sdelay`, `reverb`, `flanger`, and `comb`-style paths must clamp feedback below 1.0 and `flush()` denormals so an extreme knob cannot produce `Infinity` and permanently mute the output graph.

## Next steps
Feeds phase 06 and phase 09.
