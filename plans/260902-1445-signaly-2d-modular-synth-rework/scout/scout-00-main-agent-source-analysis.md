# Scout 00 — Source project analysis (modvibez-v2 → signaly)

**Source:** `<cablewerk-v2>` (package `modvibez-v2`, 121K LOC TS/TSX)
**Target:** `<repo>` (empty, not git-init)
**Date:** 2026-09-02

## User constraints (final)
- Pure SPA. NO Cloudflare Worker, Supabase, Clerk, multiplayer, entitlements, admin, marketing site.
- Lean/KISS/YAGNI/DRY. Non-commercial playground. Ponytail mode active.
- 2D only (drop Three/R3F + 300-file 3D asset library). Accessible, performant.
- ~40 of 68 enabled modules. Users author modules = JSON def + small TS DSP. LLM chat (BYOK key in localStorage) builds/edits module; DSP code editable.
- Faceplate = imported image (scale/stretch/crop) or prompt-generated image.
- Storage: localStorage now; account/public-sharing deferred to a later backend phase.
- No E2E now; unit tests for engine/DSP/storage only.

## Source stack (keep / drop)
| Keep | Drop |
|---|---|
| Vite 8, React 19, TS 6 strict, Zustand 5, Vitest 4, ESLint+Prettier | three, @react-three/fiber, @clerk/*, @supabase/*, wrangler, deno, @andremichelle/nam-wasm, playwright (for now) |
| AudioWorklet combined-bundle pattern (`engine/worklet/index.ts` eager glob of `*.dsp.ts`) | `typescript` in a worker for user DSP (3.7 MB chunk) — replace w/ lighter transpiler (researcher) |
| `dsp-prelude.ts` Base class + helpers (285 L) | docblock generator, knowledge-docs generator, OTK records, docs:check |
| `ModuleDef` data contract (`src/types.ts` 343 L) — SIMPLIFY (drop v1ui, brand, vibe, finish, placements, PanelBlueprint complexity) | `module-lab/` (19.9K LOC) — reference only for compile/verify/registry-overlay ideas |
| `engine/rack.ts` mutation API shape (add/remove/connect/setParam/rows) | rack stacks, case material, form, 6-row limit, power per rack |
| `store.ts` pure-state pattern | multiplayer op emission, `applyingRemote` guards |
| `patch-state.ts` (cable drag outside React) + `CableOverlay.tsx` canvas static-rope draw | 3D cables |
| `Knob.tsx` drag/keyboard/CV-halo logic (317 L) | AnalyserNode-per-knob halo (perf) — optional later |
| `user-presets.ts` versioned JSON envelope idea | checkpoints, cloud sync |
| `midi-learn.ts` (optional, phase-later) | |

## Module contract (source) — what to port
- `<id>.def.ts`: `{id,name,sub,hp,cat,worklet|native,knobs[],sws?[],ins[],outs[],extraOuts?,ui?}`.
  - KnobDef `{id,label,min,max,def,fmt?,curve?,big?,cvIn?,fader?,attenuates?}`; SwitchDef `{id,label,options[],def?}`; JackDef `{id,label,kind:'a'|'p'|'g'|'c'}`.
- `<id>.dsp.ts`: `class X extends Base { defaults():Params; process(I,O):boolean }` + `registerProcessor(def.worklet, X)`. Inputs/outputs ordered as def.ins/def.outs. Params via `this.p`, updated by port msg `{t:'p',id,v}`. Signals in volts (audio ±5, gate 0/5, pitch 1V/oct 0V=C4).
- `<id>.native.ts`: `{audio(m), param?(m,id,v), patchState?, dispose?}` for Web-Audio-graph modules (out, mix, mult, scope, spect, volt, kbd, midiin, voct, xy).
- `<id>.front-panel.ts`: normalized 0..1 node coords `{id:'knob:oct', kind, x,y,w,h, assetId, label}`. Coordinates reusable; `assetId` (3D asset ids) drop.
- `<id>.serialize.ts` (14 modules): `{save(m), load(m,o), validate?(o)}`.
- Registry: `import.meta.glob('./*/*.def.ts', {eager:true})` — keep this pattern; drop DISABLED list (just don't copy those folders).
- Engine invariants worth keeping: audio nodes outside React; one cable per jack; engine owns side effects, store is pure; attenuverter GainNode inserted on `c` inputs with `attenuates`.

## Custom-UI modules (need module-specific React parts)
`seq`, `matrix`, `cliplaunch`, `drumsampler` have `*.parts.tsx`. Others use `panel-runtime-model.ts` (942 L) display variants: scope/spectrum/meter/piano/step-grid/tempo. **Lean plan:** support a small set of 2D "display" primitives (scope, meter, LED, step-grid) and skip modules needing heavy custom parts unless cheap.

## Licensing
MI ports (`braids, clouds, plaits, rings, marbles, tides2`) + `gangnam, plateau, seq16, xy` are DISABLED in source. Exclude all; also drop the largest DSP files (braids 2048 L, rings 1242, tides2 1173).

## Proposed 40-module shortlist (by category; small/medium DSP, mostly Standard panel)
- SOURCES (6): vco, duo, lfo, noise, noiselab, quad
- FILTERS (5): svf, ladder, comb, formant, wasp
- ENV/FUNC (4): adsr, func, atn, snh
- AMP/MIX (5): vca, mix, mult, comp, gate
- FX (9): ddelay, sdelay, reverb, chorus, flanger, bbd, crush, dist, tape
- VOICES (2): monov, chordv
- SEQ/CTRL (6): clock, clockdiv, euklid, seq, arp, kbd
- DRUMS (2): drum2, adrum
- METERS (3): scope, volt, spect
- OUTPUT (1): out
- UTILITY (1): voct
= 44 candidates; planner trims to 40 (drop e.g. spect, comp, chordv, bbd if custom-UI cost high). `seq`/`adrum` need serialize + custom parts → schedule last.

## Source file map (paths for porting agents)
- Types: `src/types.ts`, `src/engine/types.ts`
- Engine: `src/engine/{audio-context,rack,rack-domain,node-factory,dsp-prelude,patch}.ts`, `src/engine/worklet/index.ts`
- State: `src/state/{store,settings,external-api-key}.ts`
- 2D UI: `src/ui/{SlimRack,Row,ModulePanel,PanelScene2D,RuntimePanelElements2D,Knob,Fader,Switch,Jack,CableOverlay,patch-state,render-bus,RenderPump,module-api,formatters,kind-color,module-drag,ModuleBrowser,PatchMenu}.tsx|ts`, `src/ui/primitives/*`, `src/index.css` (8210 L — mine selectively)
- Presets: `src/patches/user-presets.ts`, `src/patches/presets/init.ts`
- Module-lab reference: `src/module-lab/runtime/{compiler,compiler.worker,custom-module-registry,preview-runtime}.ts`, `src/module-lab/generation.ts` (JSON-patch proposal protocol), `src/module-lab/schema.ts` (draft contract — too heavy, simplify)
- Modules: `src/modules/<id>/`; tests `tests/modules/<id>.*.test.ts` (82 files)

## Over-engineering to NOT carry over
- 12 `PanelVibeId`s, 5 finishes, 300+ 3D asset descriptors, OTK docs, docblock coverage gate, bundle-budget tool, artifact signing, entitlement RPCs, Codex local bridge, Diátaxis doc system, eslint-suppressions ledger, 6 vitest/playwright configs.
- Every source file has verbose boilerplate docblocks ("Performs the X operation…") — do not replicate.

## Unresolved questions
1. Exact 40 — planner picks from shortlist; user can swap.
2. User-DSP transpile: sucrase vs esbuild-wasm vs shipping `typescript` (researcher-01).
3. Faceplate image storage: localStorage data-URL w/ cap vs IndexedDB (researcher-02).
4. Keep MIDI-learn in v1? Suggest: defer (YAGNI) unless kbd/midiin trivially ports.
