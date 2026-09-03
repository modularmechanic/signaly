# Phase 01 — Foundation: scaffold, engine, state, storage

## Context links
- Plan: [plan.md](plan.md)
- Reports: [scout-00](scout/scout-00-main-agent-source-analysis.md) · [scout-01](scout/scout-01-reusable-code-map.md) · [researcher-02](research/researcher-02-2d-eurorack-ui-accessibility-storage-report.md)
- Source (read-only): `<cablewerk-v2>`

## Parallelization Info
- **Group:** 1 (solo, first)
- **Runs with:** nothing
- **Waits for:** nothing. Blocks 02, 03, 04, 05, 06, 07, 08, 09.

## Overview
- Date: 2026-09-02 · Priority: P1 (blocking) · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- Scaffold the project and land the whole non-visual spine: types, audio engine, Zustand stores, storage, hooks, module registry, computed panel layout, design tokens, and the five display atoms that are pure canvas (no interaction, so they belong here not in the UI kit).

## Key Insights
- Engine layer is small and clean — `audio-context` + `node-factory` + `patch` + `dsp-prelude` ≈ 510 L, ports near-verbatim once the docblocks are stripped (scout-01 verdict table).
- `rack.ts` (516 L) is good shapes tangled with multiplayer/rack-power/HP-capacity. Keep the signatures, rewrite the body → ~200 L (scout-01).
- **Worklet URL correction:** `src/engine/audio-context.ts` in the source carries an explicit warning that `new URL('./worklet/index.ts', import.meta.url)` does NOT work in a Vite build (Vite serves the raw `.ts` as a `video/mp2t` asset, never expands the glob). Use `import workletUrl from './worklet-entry.ts?worker&url'`.
- Render quantum is 128 frames *today* but the spec allows variable sizes — always read `input[0][0].length`, never hardcode (researcher-02 §5).
- Per-frame audio-derived values must never enter React state; a single rAF pump (`render-bus`) mutates canvases/refs directly (researcher-02 §2).
- localStorage is 5 MB and synchronous — JSON only, never images (researcher-02 §4).

## Requirements
- `npm run typecheck`, `npm run lint`, `npx vitest run` all pass with zero modules present (globs resolve empty).
- No React component imports an engine mutation directly except through `state/` or `hooks/`.
- Audio nodes live on `ModuleInstance`, outside React. Store stays pure — only `rack.ts` performs audio side effects.
- One cable per input jack, enforced in `rack.connectCable`.

## Architecture

`src/core/types.ts` (data contract, no runtime):
```ts
export type Kind = 'a' | 'p' | 'g' | 'c';
export type Cat = 'SOURCES'|'FILTERS'|'ENV / FUNC'|'AMP / MIX'|'FX'|'VOICES'
                | 'SEQ / CTRL'|'DRUMS'|'METERS'|'OUTPUT'|'UTILITY'|'CUSTOM';
export type FmtName = 'fHz'|'fMs'|'fPc'|'f1'|'fSemi'|'fInt'|'fKey'|'fChord'|'fShape'|'fRate';
export type Display = 'scope'|'meter'|'steps'|'env'|'piano'|'text';

export interface KnobDef  { id: string; label: string; min: number; max: number; def: number;
                            fmt?: FmtName; curve?: 'lin'|'log'; big?: boolean; fader?: boolean;
                            cvIn?: string; attenuates?: string }
export interface SwitchDef{ id: string; label: string; options: string[]; def?: number }
export interface JackDef  { id: string; label: string; kind: Kind }
export interface ModuleDef{ id: string; name: string; sub: string; hp: number; cat: Cat; dark?: boolean;
                            worklet?: string; native?: string;      // exactly one
                            knobs: KnobDef[]; sws?: SwitchDef[]; ins: JackDef[]; outs: JackDef[];
                            display?: Display;
                            panel?: PanelLayout }   // authored by built-ins via `<id>.panel.ts`; optional for user modules <!-- Updated: Validation Session 1 - panel field -->
export const CAT_COLOR: Record<Cat, string>;   // port values from source src/types.ts:312
export const CAT_ORDER: readonly Cat[];

export type PanelNodeKind = 'knob'|'fader'|'switch'|'led'|'in'|'out'|'display'|'label';
export interface PanelNode  { id: string; kind: PanelNodeKind; x: number; y: number; w: number; h: number; label?: string }
export interface PanelLayout{ nodes: PanelNode[] }   // authored (`<id>.panel.ts`) or computed by panel-layout.ts as fallback
```

`src/engine/types.ts`:
```ts
export interface JackRef { node: AudioNode; idx: number }
export interface ModuleInstance {
  uid: number; def: ModuleDef; node?: AudioWorkletNode;
  jacks: { in: Record<string, JackRef>; out: Record<string, JackRef> };
  vals: Record<string, number>; sws: Record<string, number>;
  natives?: AudioNode[];
  cvGains?: Record<string, { node: GainNode; target: JackRef }>;
  ext: Record<string, unknown>;
}
export interface NativeSpec { audio(m: ModuleInstance): void; worklets?: readonly string[];
  param?(m: ModuleInstance, id: string, v: number): void;
  patchState?(m: ModuleInstance, dir: 'in'|'out', jack: string, connected: boolean): void;
  dispose?(m: ModuleInstance): void }
export interface SerializeSpec { save(m: ModuleInstance): unknown; load(m: ModuleInstance, o: unknown): void;
  validate?(o: unknown): boolean }
export interface ModuleSpec { def: ModuleDef; native?: NativeSpec; serialize?: SerializeSpec;
  parts?: React.ComponentType<{ m: ModuleInstance }> }
export interface Cable   { id: number; from: { uid: number; jack: string }; to: { uid: number; jack: string } }
export interface RackRow { id: string; uids: number[] }
```

`src/engine/rack.ts` — exported signatures (bodies rewritten from source `src/engine/rack.ts`, dropping `emitRackOp`, `forceUid`/`forceId`, `moduleRackIsPowered`, `cableCanCarrySignal`, `checkModulePlacement`, `setCableColor`, all rack/stack/power fns):
```ts
addModule(defId: string, row?: number): ModuleInstance | null
removeModule(uid: number): void
duplicateModule(uid: number): ModuleInstance | null
connectCable(from: {uid:number;jack:string}, to: {uid:number;jack:string}): Cable | null
disconnectCable(id: number): void
setParam(uid: number, id: string, v: number): void
setSwitch(uid: number, id: string, i: number): void
addRow(): string;  removeRow(rowId: string): void
moveModule(uid: number, toRow: number, toIndex: number): void
clearRack(): void
rowUsedHp(rowId: string): number          // sum of declared def.hp for uids in the row
```
<!-- Updated: Validation Session 1 - row capacity -->
Row capacity: `settings-store.rowWidthHp` (default `104`, range 20–208, persisted). `addModule`, `duplicateModule`, and `moveModule` compute `rowUsedHp(target) + def.hp` (minus the moving module's own hp on a same-row move) and return `null` / `false` without touching audio or state when it exceeds `rowWidthHp`. `moveModule` therefore returns `boolean`. UI (phase 06) surfaces the rejection; the engine never throws for it. No effective-HP solver — declared `def.hp` is the width.

`src/storage/local-json.ts` — versioned envelope (researcher-02 §4):
```ts
interface Envelope<T> { v: 1; data: T }
export function readJson<T>(key: string, fallback: T): T   // parse, check v===1, else fallback
export function writeJson<T>(key: string, data: T): void   // try/catch QuotaExceededError
export function removeJson(key: string): void
export const KEYS = { patches:'signaly.patches.v1', settings:'signaly.settings.v1',
                      apiKeys:'signaly.api-keys.v1', userModules:'signaly.user-modules.v1' } as const;
```

`src/engine/snapshot.ts` — adapted from source `src/multiplayer/rack-snapshot.ts` (drop `RackStackSnapshot`, `racks`, `rackPlanFromSnapshot`, `RACK_SNAPSHOT_LIMITS`):
```ts
type PatchFile      = { format: 'signaly.patch'; version: 1; name: string; snapshot: RackSnapshot }
type RackSnapshot   = { modules: ModuleSnapshot[]; cables: CableSnapshot[]; rows: number[][] }
type ModuleSnapshot = { mtype: string; uid: number; vals: Record<string,number>; sws: Record<string,number>; ext?: unknown }
type CableSnapshot  = { id: number; from: {uid:number;jack:string}; to: {uid:number;jack:string} }
export function isRackSnapshot(o: unknown): o is RackSnapshot   // deep guard, 2 MB caller-side cap
export function snapshotRack(): RackSnapshot
export function applySnapshot(s: RackSnapshot): void
```

`src/modules/registry.ts` — Vite eager globs (patterns must stay literal, no exclusion lists needed since withheld modules simply are not copied):
```ts
const defMods       = import.meta.glob<{ def: ModuleDef }>('./*/*.def.ts', { eager: true });
const nativeMods    = import.meta.glob<{ native: NativeSpec }>('./*/*.native.ts', { eager: true });
const serializeMods = import.meta.glob<{ serialize: SerializeSpec }>('./*/*.serialize.ts', { eager: true });
const partsMods     = import.meta.glob<{ parts: ModuleSpec['parts'] }>('./*/*.parts.tsx', { eager: true });
// join by folder segment -> Map<string, ModuleSpec>; expose getSpec(id), allSpecs(), registerSpec(spec), unregisterSpec(id)
```
`registerSpec`/`unregisterSpec` exist for phase 07's runtime user modules — that is a real second caller, not speculation.

<!-- Updated: Validation Session 1 - layoutPanel fallback -->
`src/modules/panel-layout.ts` — `layoutPanel(def: ModuleDef): PanelLayout` returns `def.panel` when present (all 40 built-ins ship one; user modules may), else computes normalised 0..1 coords:
1. header band `y 0..0.10`;
2. knob/fader grid, 2 columns (1 column when `hp <= 4`), `big` knobs span both columns;
3. switch row(s);
4. `display` block (fixed 0.18 tall) when `def.display` set;
5. input jacks row(s), then output jacks row(s), pinned to the bottom.
Memoise per `def.id` in a module-scope `Map`.

`src/engine/worklet-entry.ts`:
```ts
/// <reference types="@types/audioworklet" />
import.meta.glob('../modules/*/*.dsp.ts', { eager: true });   // each file ends with registerProcessor(...)
```
Never import this from the main thread.

## Related code files
**Create (all under `<repo>/`):**
- `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `index.html`
- `src/core/types.ts`
- `src/engine/{audio-context,dsp-prelude,worklet-entry,node-factory,patch,rack,snapshot,types}.ts`
- `src/state/{rack-store,ui-store,settings-store}.ts`
- `src/storage/{local-json,image-store,api-key-store,preset-store,user-module-store}.ts`
- `src/hooks/{module-api.ts,render-bus.ts,patch-state.ts,formatters.ts,use-canvas.ts}`
- `src/modules/{registry,panel-layout}.ts`
- `src/styles/{tokens,base}.css`
- `src/ui/atoms/{led,step-grid,env-display,channel-meter,mini-piano}.tsx`
- Colocated tests: `src/engine/{rack,snapshot,dsp-prelude}.test.ts`, `src/storage/local-json.test.ts`, `src/modules/panel-layout.test.ts`, `src/hooks/formatters.test.ts`
- `tests/module-contract-sweep.test.ts`

**Port FROM (strip docblocks — roughly 40% of every source file is boilerplate prose):**
| target | source | verdict |
|---|---|---|
| `engine/dsp-prelude.ts` | `src/engine/dsp-prelude.ts` (285 L) | port verbatim → ~170 L |
| `engine/audio-context.ts` | `src/engine/audio-context.ts` (102 L) | port, keep `?worker&url` + gesture-resume |
| `engine/node-factory.ts` | `src/engine/node-factory.ts` (105 L) | port minus `drumBus` branch + `WorkletNodeContract` interface (inline the 4 args) |
| `engine/patch.ts` | `src/engine/patch.ts` (22 L) | port verbatim |
| `engine/rack.ts` | `src/engine/rack.ts` (516 L) | adapt, keep signatures |
| `engine/snapshot.ts` | `src/multiplayer/rack-snapshot.ts` (432 L) | adapt |
| `state/rack-store.ts` | `src/state/store.ts` | adapt: keep `modulesByUid`, `jackKey`, `connectedJacks`, `selectModuleRevision`, `selectConnectedJacks`; drop `applyingRemote`, rack expectations |
| `storage/preset-store.ts` | `src/patches/user-presets.ts` (355 L) | adapt → ~150 L, drop legacy-key migration + session fallback |
| `hooks/patch-state.ts` | `src/ui/patch-state.ts` (171 L) | port as-is **plus** a keyboard-patching arm slot: `armJack(uid, dir, jackId)`, `getArmed()`, `cancelArm()`, `subscribeArm(fn)` — ~15 L. Phase 05's jack atom and phase 06's live region are the two consumers |
| `hooks/module-api.ts` | `src/ui/module-api.ts` (155 L) | port as-is |
| `hooks/render-bus.ts` | `src/ui/render-bus.ts` (61 L) | port as-is |
| `hooks/formatters.ts` | `src/ui/formatters.ts` (56 L) | port as-is |
| `hooks/use-canvas.ts` + 4 atoms | `src/ui/primitives/{use-canvas,LED,StepGrid,EnvDisplay,ChannelMeter,MiniPiano}.tsx` (442 L total) | port as-is, rename to kebab-case |
| `styles/tokens.css` + `base.css` | `src/index.css` L4796–4807, 5309–5412, 6173–6208 | mine tokens, reset, a11y toggles |

**Delete:** none (empty directory).

## File Ownership
Exclusively owns: every root config file, `index.html`, and everything under `src/core/`, `src/engine/`, `src/state/`, `src/storage/`, `src/hooks/`, plus `src/modules/registry.ts`, `src/modules/panel-layout.ts`, `src/styles/tokens.css`, `src/styles/base.css`, the five display atoms listed above, and `tests/module-contract-sweep.test.ts`.
Does **not** create `src/main.tsx` or `src/app.tsx` — phase 06 owns both. `index.html` references `/src/main.tsx`, so `npm run dev`/`build` are expected to fail until phase 06 lands; that is intentional and keeps file ownership exclusive.

## Implementation Steps
1. `npm init` + install. Exact `package.json`:
   - deps: `react@^19.2`, `react-dom@^19.2`, `zustand@^5`, `sucrase@^3`, `idb-keyval@^6`
   - devDeps: `vite@^8`, `@vitejs/plugin-react@^6`, `typescript@^6`, `typescript-eslint@^8`, `eslint@^10`, `@eslint/js@^10`, `eslint-plugin-react-hooks@^7`, `eslint-config-prettier@^10`, `prettier@^3`, `vitest@^4`, `jsdom@^30`, `@types/react@^19`, `@types/react-dom@^19`, `@types/audioworklet@^0.0.100`
   - scripts: `dev: vite`, `build: tsc -b && vite build`, `preview: vite preview`, `typecheck: tsc --noEmit`, `lint: eslint . --max-warnings 0`, `format: prettier -w .`, `test: vitest run`
2. `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess: true`, `verbatimModuleSyntax: true`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `types: ["vite/client"]`. Exclude `src/engine/worklet-entry.ts` and `src/modules/*/*.dsp.ts` from the DOM lib program only if `@types/audioworklet` conflicts; otherwise reference it per-file.
3. `vite.config.ts`: `plugins: [react()]`, `test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'] }`. No worklet plugin needed — `?worker&url` is built in.
4. Write `src/core/types.ts` (shape above) and `src/engine/types.ts`.
5. Port `dsp-prelude.ts`. Exports in order: `TP`, `clamp`, `DENORMAL`, `flush`, `ch`, `blep`, `oscW`, `Params`, `BaseOptions`, `InMsg`, `Base`, `DL`, `onePoleCoeff`, `OnePole`, `ClockSync`, `SYNC_DIV`. Keep the `Base` port-message contract exactly: reject non-objects; `m.t==='p' && typeof m.id==='string' && Number.isFinite(m.v)` → `this.p[id]=v; this.onParam?.(id,v)`; else `this.msg?.(m)`.
6. Port `audio-context.ts`, `worklet-entry.ts`, `node-factory.ts` (keep `installCvAttenuverters` — it is the attenuverter invariant), `patch.ts`.
7. Rewrite `rack.ts` against the signatures above. `connectCable` must disconnect any existing cable on the destination input first, then `patch.connect`, then `notifyPatchState` both ends.
8. Write `snapshot.ts` with the deep `isRackSnapshot` guard.
9. Write the three Zustand stores. `rack-store` holds `modules`, `cables`, `rows`, `revision`; selectors return primitives or memoised refs only (`Object.is` snapshot comparison — researcher-02 §2). `ui-store` holds `view: 'rack'|'builder'`, `browserOpen`, `selectedUid`. `settings-store` holds reduced-motion override, storage-usage flag.
10. Write `storage/*`. `image-store.ts` wraps `idb-keyval` `get/set/del` with `faceplate:<id>` keys and returns `Blob`. `api-key-store.ts` reads/writes `{ anthropic?, openai?, gemini? }` and exposes `hasAnyKey()`. Call `navigator.storage.persist()` once, best-effort, on first write.
11. Port the four hooks + `use-canvas` + the five display atoms. Add the keyboard-patching arm slot to `patch-state.ts` (source has pointer drag only): a module-scope `armed: {uid,dir,jackId} | null` with `armJack`/`getArmed`/`cancelArm`/`subscribeArm`. Keep it outside React, like the existing drag state.
12. Write `registry.ts` and `panel-layout.ts`.
13. Write `styles/tokens.css` (colour tokens incl. the four signal-kind colours and `CAT_COLOR` faceplate tints as custom properties) and `base.css` (reset, focus-visible ring, `prefers-reduced-motion` block, `.visually-hidden`).
14. Write tests. `tests/module-contract-sweep.test.ts` iterates `allSpecs()` and asserts per-def invariants only (no count assertion — phase 09 owns the catalog count test).

## Todo list
- [ ] Scaffold + configs + `index.html`
- [ ] `core/types.ts`, `engine/types.ts`
- [ ] `dsp-prelude`, `audio-context`, `worklet-entry`, `node-factory`, `patch`
- [ ] `rack.ts` rewrite
- [ ] `snapshot.ts`
- [ ] Three Zustand stores
- [ ] Five storage modules
- [ ] Five hooks + five display atoms
- [ ] `registry.ts` + `panel-layout.ts`
- [ ] `tokens.css` + `base.css`
- [ ] Tests: rack, snapshot, prelude, local-json, panel-layout, formatters, contract sweep

## Success Criteria
- `npm run typecheck` clean.
- `npm run lint` clean at `--max-warnings 0`.
- `npx vitest run` green; contract sweep passes trivially with zero modules.
- `rack.test.ts` proves: one cable per input, attenuverter gain inserted for a `c` input with `attenuates`, `removeModule` drops dependent cables, `setParam` posts `{t:'p',id,v}`.
- `snapshot.test.ts` round-trips a two-module patch and rejects malformed input.
- No file over 200 lines; every filename kebab-case.

## Conflict Prevention
Sole phase in group 1 — no concurrency. Must not create `src/main.tsx`, `src/app.tsx`, any `src/modules/<id>/` folder, any `src/ui/molecules|organisms|templates|pages` file, any `src/features/` file, or the CSS files owned by 05/08.

## Risk Assessment
- **Worklet URL regression** (high impact): if `?worker&url` is replaced with `new URL(...)` the whole DSP layer silently 404s at runtime. Mitigate with a comment at the import site and a smoke check in phase 09.
- **`@types/audioworklet` vs DOM lib collision** (medium): `AudioWorkletProcessor`/`sampleRate` globals only exist in worklet scope. If `tsc --noEmit` conflicts, add a `/// <reference types="@types/audioworklet" />` at the top of each `.dsp.ts` and keep the DOM lib global.
- **Selector churn** (medium): a Zustand selector returning a fresh object re-renders every module every frame. Enforce primitive/memoised returns in review.

## Security Considerations
- API keys land in `localStorage` (`api-key-store.ts`) — never log them, never include them in error payloads, scrub before any `console.error`. Any XSS reads them; this phase's `index.html` carries the CSP meta tag `script-src 'self' blob:` (blob: is required for `audioWorklet.addModule`), no `unsafe-inline`, no third-party script origins — that is the real mitigation.
- `snapshot.applySnapshot` consumes untrusted imported JSON: `isRackSnapshot` must validate every field's type before use, cap array lengths, and reject unknown `mtype` ids rather than throwing.
- `local-json.readJson` must never `JSON.parse` into a typed value without checking `v === 1`, and must swallow parse errors into the fallback.

## Next steps
Unblocks phases 02, 03, 04, 05, 07 (all parallel).
