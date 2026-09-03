# Phase 02 — Modules batch A: sources, filters, env/func (15)

## Context links
- Plan: [plan.md](plan.md) · Foundation: [phase-01](phase-01-foundation-engine-state-storage.md)
- Reports: [scout-00](scout/scout-00-main-agent-source-analysis.md) §"Module contract" · [scout-01](scout/scout-01-reusable-code-map.md) §"Base class contract"
- Source (read-only): `<cablewerk-v2>/src/modules/<id>/`

## Parallelization Info
- **Group:** 2
- **Runs with:** 03, 04, 05, 07
- **Waits for:** 01 (needs `core/types.ts`, `engine/dsp-prelude.ts`, `engine/types.ts`, `modules/registry.ts`)

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- Port 15 worklet modules — all `def` + `dsp`, zero native, zero custom parts. The easiest batch: every DSP file is 35–149 lines and depends only on prelude exports.

## Key Insights
- All 15 are `def.ts` + `dsp.ts` + `front-panel.ts` in the source. **`front-panel.ts` IS ported** as a compact `<id>.panel.ts` (coords only; see recipe step 8). Computed layout in `modules/panel-layout.ts` is only the fallback for user modules. <!-- Updated: Validation Session 1 - panel insight -->
- Every source file carries ~40% boilerplate docblocks ("Performs the X operation…") — do not replicate (scout-00).
- DSP files use only prelude symbols: `Base`, `ch`, `clamp`, `TP`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `ClockSync`, `SYNC_DIV`, `sampleRate`. No filter/slew helpers exist in the prelude — filters are per-module and come along in the DSP file (scout-01).
- Signal convention: volts. Audio ±5, gate 0/5, pitch 1V/oct with 0 V = C4.

## Requirements
- Each module folder contains exactly `<id>.def.ts` and `<id>.dsp.ts`. Nothing else.
- `def.worklet` equals the source's worklet name, unchanged (the DSP file's `registerProcessor` string must match).
- Input/output arrays in `process(I, O)` are ordered exactly as `def.ins` / `def.outs`.
- No `.dsp.ts` allocates inside `process()` — pre-allocate in the constructor (researcher-02 §5).
- `input[0][0].length` is read, never a hardcoded 128.

## Architecture — the port recipe (applies to every module in this batch)
1. `cp <src>/<id>/<id>.def.ts` → `src/modules/<id>/<id>.def.ts`.
2. Strip all docblocks and inline prose comments; keep genuinely explanatory one-liners only.
3. Fix the type import to `import type { ModuleDef } from '../../core/types';`.
4. Delete def fields that no longer exist: `v1ui`, `brand`, `subtype`, `extraOuts`, `ui`. Keep `dark`.
5. Collapse `cvIn` object form (`{ jack, amt, depth }`) to the plain jack-id string.
6. If the source module had a display in `src/ui/panel-runtime-model.ts`, set `display:` per the table below; otherwise omit the field.
7. `cp <src>/<id>/<id>.dsp.ts` → `src/modules/<id>/<id>.dsp.ts`. Strip docblocks. Fix the prelude import to `'../../engine/dsp-prelude'`. Add `/// <reference types="@types/audioworklet" />` as line 1 if `tsc` complains about `sampleRate`/`AudioWorkletProcessor`.
8. Create `<id>.panel.ts` from the source `<id>.front-panel.ts`: `export const panel: PanelLayout = { nodes: [...] }` — keep `id`, `x`, `y`, `label`; rename `width`/`height` → `w`/`h`; map `kind` `'dial'`→`'knob'`, `'input'`→`'in'`, `'output'`→`'out'`, `'screen'`→`'display'`, `'led'`→`'led'`; drop `assetId`, `labelStyle`, `elementId`, `group`, `labelMode`, `typography`, `spacing`, `columns`, `compositions`, `parts` (runtime parts bind by id, not geometry). Write it as plain literals (no helper factories) so it reads as data. Import it in `<id>.def.ts` and set `panel`. Every `knob:`/`switch:`/`input:`/`output:` node id must match a control or jack id in the def (the contract sweep checks this). <!-- Updated: Validation Session 1 - panel port -->
9. Verify the DSP file imports nothing outside the prelude. If it does, inline the dependency or flag it.

## Module table
| id | route | source files | notes |
|---|---|---|---|
| vco | worklet | def 35 L, dsp 70 L | uses `oscW`+`blep` |
| duo | worklet | def 38, dsp 64 | dual osc |
| lfo | worklet | def 40, dsp 78 | — |
| noise | worklet | def 21, dsp 41 | smallest module in the project |
| noiselab | worklet | def 54, dsp 149 | largest def in batch; multi-switch |
| quad | worklet | def 42, dsp 57 | 4 outputs — check `outs` ordering carefully |
| svf | worklet | def 42, dsp 62 | clean reference module |
| ladder | worklet | def 40, dsp 65 | — |
| comb | worklet | def 27, dsp 51 | uses `DL` |
| formant | worklet | def 36, dsp 73 | — |
| wasp | worklet | def 43, dsp 70 | — |
| adsr | worklet | def 31, dsp 66 | `display: 'env'` |
| func | worklet | def 31, dsp 83 | — |
| atn | worklet | def 31, dsp 35 | attenuverter — check `attenuates` wiring against `node-factory.installCvAttenuverters` |
| snh | worklet | def 48, dsp 120 | — |

## Related code files
**Create:** `src/modules/{vco,duo,lfo,noise,noiselab,quad,svf,ladder,comb,formant,wasp,adsr,func,atn,snh}/<id>.{def,dsp}.ts` (30 files).
**Port FROM:** `<cablewerk-v2>/src/modules/<id>/<id>.{def,dsp}.ts` for each id above.
**Modify:** none.
**Delete:** none.

## File Ownership
Exclusively owns `src/modules/vco/`, `duo/`, `lfo/`, `noise/`, `noiselab/`, `quad/`, `svf/`, `ladder/`, `comb/`, `formant/`, `wasp/`, `adsr/`, `func/`, `atn/`, `snh/`. Owns no file outside `src/modules/`. Must not touch `registry.ts`, `panel-layout.ts`, or any other module folder — the registry picks these up by glob with zero edits.

## Implementation Steps
1. Read `src/modules/svf/svf.def.ts` + `svf.dsp.ts` in the source as the canonical reference pair (scout-01 calls it "clean"), and port `svf` first end to end.
2. Confirm `svf` typechecks against the new `core/types.ts` before porting the other 14 — a type mismatch found here is a mismatch in all 15.
3. Port the remaining SOURCES: `vco`, `duo`, `lfo`, `noise`, `noiselab`, `quad`.
4. Port the remaining FILTERS: `ladder`, `comb`, `formant`, `wasp`.
5. Port ENV/FUNC: `adsr` (set `display: 'env'`), `func`, `atn`, `snh`.
6. For `atn`, verify each knob with `attenuates` names an existing `c`-kind input jack id — `installCvAttenuverters` silently skips a mismatch.
7. Add one colocated behavioural test per category (not per module): `src/modules/vco/vco.dsp.test.ts` (osc produces non-zero bounded output at a known param set), `src/modules/svf/svf.dsp.test.ts` (cutoff sweep changes output energy), `src/modules/adsr/adsr.dsp.test.ts` (gate 5 V → rise, gate 0 → fall). Instantiate the processor class directly with plain `Float32Array` buffers; no `AudioContext` needed.

## Todo list
- [ ] Port `svf` as the reference pair, typecheck
- [ ] SOURCES: vco, duo, lfo, noise, noiselab, quad
- [ ] FILTERS: ladder, comb, formant, wasp
- [ ] ENV/FUNC: adsr, func, atn, snh
- [ ] Verify `atn` attenuverter jack ids
- [ ] Three DSP behaviour tests

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run` all pass.
- `tests/module-contract-sweep.test.ts` (owned by 01) picks up all 15 and passes: each has `worklet` set and `native` unset, non-empty `outs`, every `knob.def` within `[min,max]`, every `cvIn`/`attenuates` referencing a real jack id, unique ids across the registry.
- Every module folder has exactly one `<id>.panel.ts`; no `<id>.front-panel.ts` exists in the repo. Contract sweep: every panel node id resolves to a def control/jack and all coords are within 0..1. <!-- Updated: Validation Session 1 - panel success -->
- Every ported file under 200 lines (`noiselab.dsp.ts` at 149 is the ceiling).

## Conflict Prevention
Only phase touching these 15 folders. Registry and worklet-entry pick files up by glob, so no shared file is edited. Phases 03 and 04 own disjoint module folders. If a shared DSP helper looks tempting, do **not** add it to `engine/dsp-prelude.ts` (owned by 01) — duplicate the handful of lines inside the module and raise it in phase 09.

## Risk Assessment
- **Prelude drift** (medium): a DSP file may reference a prelude symbol that phase 01 renamed. Fail loudly at typecheck, then match phase 01's naming — do not re-add the symbol locally.
- **Jack ordering** (medium): `quad`'s four outputs and `noiselab`'s switches are the likeliest places to silently reorder `def.outs` against the DSP's `O[n]` indices. Cross-check index by index.
- **Docblock stripping over-reach** (low): a few comments encode real DSP intent (coefficient derivations). Keep those.

## Security Considerations
Built-in DSP is first-party code compiled at build time — none of the phase-07 user-module sandbox applies here. The one real concern is denial of service by an unbounded `process()`: verify each ported DSP clamps feedback paths (`comb`, `formant`, `wasp` are the resonant ones) so a knob extreme cannot produce `Infinity` and mute the whole graph.

## Next steps
Feeds phase 06 (rack renders these) and phase 09 (catalog count test).
