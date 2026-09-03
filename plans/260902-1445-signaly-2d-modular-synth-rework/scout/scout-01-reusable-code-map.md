# scout-01 — Reusable code map (source → signaly 2D)

Source: `<cablewerk-v2>`

## Summary
Engine layer is small and clean: `audio-context` + `node-factory` + `patch` + `dsp-prelude` = ~510 L, port near-verbatim minus docblocks (strip ~40% of every file — the "Performs the X operation" blocks are pure noise). `rack.ts` core mutations are good but tangled with multiplayer (`emitRackOp`, `forceUid`/`forceId`), rack power, HP capacity — rewrite keeping the same function signatures. UI helper quartet (`patch-state`, `module-api`, `render-bus`, `formatters` = 443 L) ports as-is. The `panel-runtime-model.ts` (942 L) + `front-panel-runtime.ts` + `PanelDisplayVariant` (12 variants) indirection is the biggest over-build in the 2D path: **drop it**, put display type directly in the module def. Primitives (442 L) are the real win — 7 small components covering every display need.

## Verdict table
| source path | lines | verdict | notes |
|---|---|---|---|
| `src/engine/dsp-prelude.ts` | 285 | **port** | ~170 L after docblock strip. Full contract below. |
| `src/engine/audio-context.ts` | 102 | **port** | `?worker&url` worklet import is the load-bearing trick; gesture-resume ~20 L. |
| `src/engine/node-factory.ts` | 105 | **port** (minus drumBus) | `createWorkletModuleNode` + `makeNode` + `installCvAttenuverters` + `pushParam`. Drop `d.v1ui?.drumMix` branch and `WorkletNodeContract` interface (inline the 4 args). |
| `src/engine/patch.ts` | 22 | **port** | 2 functions, trivial. |
| `src/engine/rack.ts` | 516 | **adapt** | Keep shapes of `addModule/removeModule/duplicateModule/connectCable/disconnectCable/setParam/setSwitch/teardownModule/notifyPatchState`. Drop: `emitRackOp` (every mutation), `forceUid`/`forceId`, `moduleRackIsPowered`/`cableCanCarrySignal`, `checkModulePlacement` capacity, `setCableColor`. Est. 200 L after. |
| `src/ui/patch-state.ts` | 171 | **port as-is** | Jack registry keyed `uid:dir:jackId`, `jackCenter`, drag state outside React, `setCompat` body-class for compatible-jack highlight, `unpatchInput`. |
| `src/ui/module-api.ts` | 155 | **port as-is** | `useSyncedValue, useParam, useSwitch, useModuleExt, useRenderFrame, useWorkletMessages, useWorkletFeed, usePortSend`. Exactly the hook surface a custom-module author needs. |
| `src/ui/render-bus.ts` | 61 | **port as-is** | `addDraw/runDraws/onCpu/emitCpu` — single rAF pump for all canvases. |
| `src/ui/formatters.ts` | 56 | **port as-is** | `FMT` map + `fmtValue` + `isIntFmt`. |
| `src/ui/primitives/*` | 442 | **port as-is** | `useCanvas(90) Button(22) LED(25) Select(29) StepGrid(46) MiniPiano(63) EnvDisplay(72) ChannelMeter(36)` + barrel. Two colocated tests. Best-value directory in the repo. |
| `src/ui/PanelScene2D.tsx` | 166 | **adapt** | Good structure: def→Map lookups, dispatch placement→`<Knob|Fader|Switch|Jack|ClockLed>`, then `<RuntimePanelElement2D>` for the rest. Rewrite the runtime-node half. |
| `src/ui/RuntimePanelElements2D.tsx` | 147 | **rewrite** | Only 3 real functions; generic switch over `PanelElementId`. Fold into PanelScene2D. |
| `src/ui/panel-runtime-model.ts` | 942 | **drop** | One export (`runtimePanelModel`) = giant `if (module.def.id === …)` chain returning per-module node lists. Per-module UI code hiding in a "generic" file. Mine 3–4 cases (scope/meter/tempo/piano) for wiring reference, delete the rest. |
| `src/ui/front-panel-runtime.ts` | ~90 | **drop** | `bindFrontPanelRuntime` merges runtime bindings with def geometry. Put x/y/w/h in the binding directly. |
| `src/multiplayer/rack-snapshot.ts` | 432 | **adapt** | Take `ModuleSnapshot/CableSnapshot/RackSnapshot` types + `isRackSnapshot` guard + `snapshotRack/applySnapshot`. Drop `RackStackSnapshot`, `racks`, `rackPlanFromSnapshot`, `RACK_SNAPSHOT_LIMITS`. Move to `src/engine/snapshot.ts`. |
| `src/patches/user-presets.ts` | 355 | **adapt** | Keep envelope + `list/save/rename/delete/get/serialize/parse/import/download`. Drop legacy-key migration, `LEGACY_USER_PRESET_FORMAT`, `sessionPresets` fallback mode (~90 L). Est. 150 L. |
| `src/ui/ModuleBrowser.tsx` | 199 | **adapt** | Search input (autofocus + Esc close) + category chips + `filterModuleDefs(defs, query, cat)`. ~120 L rewrite. |
| `src/ui/PatchMenu.tsx` | 176 | **port** | Presets list, name field, save, import via hidden file input, per-preset load/export/delete, `notice` string. Clean. |
| `src/modules/seq/seq.parts.tsx` | 161 | **adapt** | `useSeq(m)` hook + one StepGrid view. Deps: `usePortSend`, `useWorkletFeed`, `usePartSync`/`bumpParts` (module-part-sync), `showTip/hideTip`, `clamp`. |
| `src/modules/seq/seq.serialize.ts` | 90 | **adapt** | Simplify: 64 banks × 8 steps is speculative. Keep `getSeqState(m)` seeding-outside-React idea. |
| `src/modules/adrum/adrum.serialize.ts` | 59 | **rewrite/defer** | Depends on `drumBus` mutating `m.trkLevel/...` + `applyDrumMix`. Drop v1 drum-bus; adrum becomes plain worklet or gets cut. |
| `src/modules/*/*.front-panel.ts` | 200–550 ea | **port coords, drop assetId** | seq's is 554 L for 8 steps — generated. Re-emit compactly. |

## Base class contract (`dsp-prelude.ts`)
Exports, in file order:
`TP`(L18) · `clamp(x,a,b)`(21) · `DENORMAL=1e-18`(33) · `flush(x)`(55) · `ch(I,n)`(58, safe channel access) · `blep(t,dt)`(62) · `oscW(wave,t,dt)`(75) · `type Params = Record<string,number>`(86) · `interface BaseOptions`(92) · `interface InMsg {t:string; id?:string; v?:number; [k:string]:unknown}`(97) · `class Base`(109) · `class DL`(150, `.b/.w/.n`, `push(x)` flushes denormals, `read(d)` fractional) · `onePoleCoeff(tauMs)`(208) · `class OnePole`(216, `.a/.y/setTau/process`) · `class ClockSync`(244, `.last/.cnt/.period/tick(g)`, 2.5V threshold) · `SYNC_DIV`(285, 10 entries, index 0 = FREE).

No `slew`/`svf`/`noise` helpers exist — filters live per-module.

`Base` surface (L109-148, ~30 L of real code):
- fields: `p: Params`; optional `onParam?(id, v)`, `msg?(m: InMsg)`
- `constructor(o?: BaseOptions)` → `this.p = {...this.defaults()}`, then `Object.assign(this.p, o.processorOptions.p)`
- `this.port.onmessage`: rejects non-object; `m.t==='p' && typeof id==='string' && Number.isFinite(v)` → `this.p[id]=v; this.onParam?.(id,v)`; else delegates to `this.msg?.(m)`
- `defaults(): Params { return {} }` — subclass override
- subclass supplies `process(I, O): boolean`

## Snapshot / preset JSON envelope
```
UserPresetFile = { format: 'modvibez.user-preset', version: 1, preset: { name, snapshot } }
UserPreset     = { id, name, createdAt, updatedAt, snapshot }   // localStorage 'modvibez.user-presets.v1', array
RackSnapshot   = { modules: ModuleSnapshot[], cables: CableSnapshot[], rows: number[][], racks?: … }
ModuleSnapshot = { mtype, uid, vals: Record<string,number>, sws: Record<string,number>, ext?: unknown }
CableSnapshot  = { id, from: {uid, jack}, to: {uid, jack}, color? }
```
`ext` is the per-module `serialize.save(m)` blob, validated by `serialize.validate` on load. Guards: 2 MB file cap, `isRackSnapshot` deep validation, JSON round-trip clone. Signaly: rename format to `signaly.patch`, drop `racks`, keep `rows`.

## CSS line-range map (`src/index.css`, 8210 L)
| range | block | take |
|---|---|---|
| 3202–3929 | rack | partial — drop rack-stack/case chrome |
| 3929–4650 | **modules (category-tinted faceplate)** | yes, ~700 L, the core look |
| 4650–4701 | **knobs** | yes |
| 4701–4768 | **knob value/CV ring** (ticks, arc, CV marker) | yes |
| 4768–4796 | **switches** | yes |
| 4796–4807 | generic module canvas (VU/scope) | yes |
| 4807–4908 | **jacks** | yes |
| 4908–4949 | faders | yes |
| 4959–4986 | mini-keyboard | if kbd ported |
| 5110–5121 | step ring (euklid) | if euklid ported |
| 5121–5148 | trigger LED row | yes |
| 5251–5275 | **cables + tooltip** | yes |
| 5309–5412 | **module-api primitives** | yes — pairs with `primitives/` |
| 5412–5453 | step sequencer (seq) | if seq ported |
| 5765–5827 | MiniPiano | with primitive |
| 5827–5870 | EnvDisplay | with primitive |
| 6173–6208 | accessibility toggles | yes |
| 1957–2453 | visual module browser | adapt |
| 2453–3126 | coarse pointers / compact | mine for touch targets |
**Skip:** 1–1340 (public site), 5275–5309 (presence), 6208–6697 (checkpoints + multiplayer), 6697–8210 (large panels: granular, mix8, matrix, mixer16, KONSOLE, buttongrid, cliplaunch). Worth mining ≈ 1800 L of 8210.

## Module complexity (15 folders, total LOC incl. tests)
| module | files | LOC | note |
|---|---|---|---|
| volt | def, fp, **native** | 143 | trivial |
| mult | def, fp, native | 164 | trivial |
| kbd | def, fp, native | 215 | native; keyboard events |
| mix | def, fp, native | 236 | native |
| adsr | def, **dsp**, fp | 249 | + EnvDisplay primitive |
| monov | def, dsp, fp | 261 | composite voice |
| svf | def, dsp, fp | 294 | clean |
| clock | def, dsp, fp | 298 | + ClockLed, tempo display |
| arp | def, dsp, fp | 345 | + arp-display |
| scope | def, fp, native | 359 | native AnalyserNode + canvas |
| ddelay | def, dsp, fp | 439 | uses DL + ClockSync + SYNC_DIV |
| out | def, fp, native, analysis.ts | 553 | analysis.ts separable; meter |
| drum2 | def, dsp, fp, preview.ts | 553 | preview.ts droppable |
| euklid | def, dsp, fp | 650 | step-ring UI, fp large |
| reverb | def, dsp, fp | 939 | biggest DSP here; keep |
Only `seq/matrix/cliplaunch/drumsampler` have `.parts.tsx`. All 15 above are portable. Heaviest files are machine-generated `.front-panel.ts` coordinate dumps, not DSP.

## Unresolved questions
1. `panel-runtime-model` replacement: recommend def field `display: 'scope'|'meter'|'steps'|'text'` and cut the other 8 variants.
2. `module-part-sync.ts` (`usePartSync`/`bumpParts`) — seq depends on it; replace with `useReducer` bump in the parts component.
3. Cable rendering: confirm `jackCenter` uses `getBoundingClientRect` per frame (perf) or cached on register.
4. `checkModulePlacement`/`rack-domain.ts` needed only if HP-width rows kept; skip if free-flow layout.
5. seq's 64 banks: keep 1 bank for v1.
