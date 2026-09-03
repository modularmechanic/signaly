# Phase 06 — Rack workspace + app shell

## Context links
- Plan: [plan.md](plan.md) · Depends on: [phase-01](phase-01-foundation-engine-state-storage.md), [phase-05](phase-05-ui-kit-atoms-molecules-styles.md), modules from [02](phase-02-modules-batch-a-sources-filters-env.md)/[03](phase-03-modules-batch-b-amp-fx-voices.md)/[04](phase-04-modules-batch-c-seq-meters-output.md)
- Reports: [scout-01](scout/scout-01-reusable-code-map.md) §"Verdict table" · [researcher-02](research/researcher-02-2d-eurorack-ui-accessibility-storage-report.md) §1–2
- Source (read-only): `cablewerk-v2/src/ui/{PanelScene2D,ModulePanel,Row,SlimRack,ModuleBrowser,PatchMenu,module-drag}.tsx`

## Parallelization Info
- **Group:** 3
- **Runs with:** 08
- **Waits for:** 01, 02, 03, 04, 05 (needs the full atom/molecule kit and at least one module to render)

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- Assemble the playable app: organisms that render a module panel from its `PanelLayout` (authored for built-ins, computed fallback for user modules), rows of panels, the module browser, the patch menu, the settings dialog with BYOK key entry, and the app shell that switches between the rack and builder views. **This phase owns `main.tsx` and `app.tsx`** — it is the first phase where `npm run dev` and `npm run build` work.

## Key Insights
- `PanelScene2D.tsx` (166 L) has the right structure: look `def` up into Maps, dispatch each layout node to `<Knob|Fader|Switch|Jack>`, and render the display block last. Adapt that; **do not** port `RuntimePanelElements2D.tsx` (147 L) or `panel-runtime-model.ts` (942 L) — the second is a per-module `if (id === …)` chain hiding inside a "generic" file (scout-01).
- Layout nodes arrive from phase-01's `panel-layout.ts` as normalised 0..1 coords. `module-panel` positions each node with `left/top/width/height` percentages inside a `position: relative` faceplate.
- `ModuleBrowser.tsx` (199 L) → ~120 L: search input with autofocus and Escape-to-close, category chips, `filterModuleDefs(defs, query, cat)`.
- `PatchMenu.tsx` (176 L) ports nearly clean: preset list, name field, save, import via hidden file input, per-preset load/export/delete, one `notice` string for feedback.
- Zustand selectors must return primitives or memoised references — a selector returning a fresh array re-renders every panel on every store touch (researcher-02 §2). Phase 01 provides `selectModuleRevision` and `selectConnectedJacks` for exactly this.
- `content-visibility: auto` on off-screen rows and `contain: layout paint` on each panel (classes defined in phase 05, applied here).

## Requirements
<!-- Updated: Validation Session 1 - row capacity -->
- **Row capacity UI**: each `rack-row` header shows `used / rowWidthHp HP` and a thin fill bar. When `rack.addModule`/`duplicateModule`/`moveModule` returns a rejection, show a transient, `aria-live="polite"` notice "Row full — N HP needed, M free" near the row; never silently drop the action. Module browser entries whose `hp` exceeds the selected row's free space render with a `title` hint but stay clickable (the notice explains).
- **Settings**: a number input `Row width (HP)` bound to `settings-store.rowWidthHp` (20–208, step 2). Reducing it below a row's used HP is allowed; that row just shows over-capacity styling until modules are removed.
- One `<canvas>` for all cables, above the rack, pointer-events none except during a drag.
- The `aria-live="polite"` patch announcement region lives once, in `rack-workspace`, and reports every completed/cancelled patch and every module add/remove.
- The audio context resumes on the first user gesture — wire `resume()` into the workspace's first pointerdown (browsers start the context suspended).
- The settings dialog is the only place API keys are entered. Builder view is reachable only when `api-key-store.hasAnyKey()` is true; otherwise the nav item is disabled with a hint pointing at settings.
- `index.html` (phase 01) already carries the CSP; this phase adds no inline `<script>` and no third-party origin.

## Architecture

Component tree:
```
main.tsx  → createRoot → <App/>
app.tsx   → imports styles/{tokens,base,panel,controls,cables}.css
          → view = useUiStore(s => s.view)
          → view === 'rack' ? <RackPage/> : <BuilderPage/>          // BuilderPage from phase 08
rack-page.tsx
  └ rack-workspace.tsx                      // template: nav, aria-live region, gesture-resume, modals
      ├ rack-row.tsx        × rows          // content-visibility: auto
      │   └ module-panel.tsx × uids
      │       ├ module-header  (name, sub, category tint from CAT_COLOR)
      │       ├ knob-group / jack-row / switch / screw   ← positioned from PanelLayout nodes
      │       └ display block: scope-display | channel-meter | step-grid | env-display | mini-piano | text
      │       └ spec.parts?  (seq only)
      ├ cable-canvas.tsx                    // single canvas, all cables
      ├ module-browser.tsx                  // search + category chips
      ├ patch-menu.tsx                      // presets: save/load/import/export/delete
      └ settings-dialog.tsx                 // BYOK keys, reduced-motion, storage usage
```

Panel rendering, the whole idea in one function:
```tsx
// src/ui/organisms/module-panel.tsx
const spec = getSpec(m.def.id);
const layout = layoutPanel(m.def);                       // memoised in panel-layout.ts
return (
  <div className="module-panel" style={{ '--cat': CAT_COLOR[m.def.cat], width: `${m.def.hp * HP_PX}px` }}>
    {layout.nodes.map(n => <PanelNodeView key={n.id} node={n} m={m} />)}
    {spec?.parts ? <spec.parts m={m} /> : null}
  </div>
);
// PanelNodeView switches on n.kind -> Knob | Fader | Switch | Jack | Screw | Label | display atom
```

Store selectors used here (all stable-return):
```ts
useRackStore(s => s.rows)                       // array identity changes only on structural edits
useRackStore(selectModuleRevision(uid))         // number — panel re-renders only when its own module changes
useRackStore(selectConnectedJacks(uid))         // memoised Set — drives jack "patched" styling
useUiStore(s => s.view)                         // string
```
No selector returns a freshly-built object or array.

Cable + patch-state integration: `cable-canvas` reads cable endpoints from phase-01 `patch-state.jackCenter(uid, dir, jackId)` and registers **one** `render-bus.addDraw`. Jack atoms register their DOM rect on mount and invalidate it on scroll/resize — the canvas never calls `getBoundingClientRect` in the draw loop. Keyboard patching: `jack` (phase 05) calls `patch-state.armJack`; `rack-workspace` subscribes via `subscribeArm` and writes the announcement into the live region.

Settings dialog, key entry:
```tsx
// per provider: <input type="password" autoComplete="off" spellCheck={false} />
// on blur: save via api-key-store, then llm.listModels(key) to populate the model <select>
// no key is ever placed in a URL, a log, or a rendered error string
```

## Related code files
**Create:**
- `src/main.tsx`, `src/app.tsx`
- `src/ui/organisms/{module-panel,rack-row,module-browser,patch-menu,settings-dialog}.tsx`
- `src/ui/templates/rack-workspace.tsx`
- `src/ui/pages/rack-page.tsx`
- Tests: `src/ui/organisms/module-panel.test.tsx`, `src/ui/organisms/module-browser.test.tsx`, `src/ui/templates/rack-workspace.test.tsx`

**Port FROM:**
| target | source | verdict |
|---|---|---|
| `organisms/module-panel.tsx` | `src/ui/PanelScene2D.tsx` (166 L) + `ModulePanel.tsx` | adapt — keep the def→Map + node-dispatch structure, replace the runtime-node half |
| `organisms/rack-row.tsx` | `src/ui/Row.tsx`, `SlimRack.tsx` | adapt — drop rack stacks, case material/form, the 6-row limit, power |
| `organisms/module-browser.tsx` | `src/ui/ModuleBrowser.tsx` (199 L) | adapt → ~120 L |
| `organisms/patch-menu.tsx` | `src/ui/PatchMenu.tsx` (176 L) | port nearly clean |
| `templates/rack-workspace.tsx` | `src/ui/SlimRack.tsx` + `module-drag.ts` | adapt |

**Do not port:** `RuntimePanelElements2D.tsx`, `panel-runtime-model.ts`, `front-panel-runtime.ts`, anything under `src/ui/three/`, presence/checkpoint/multiplayer UI.
**Modify / delete:** none.

## File Ownership
Exclusively owns `src/main.tsx`, `src/app.tsx`, `src/ui/organisms/{module-panel,rack-row,module-browser,patch-menu,settings-dialog}.tsx`, `src/ui/templates/rack-workspace.tsx`, `src/ui/pages/rack-page.tsx`, and their tests. Imports (never edits) phase-01 hooks/stores/registry, phase-05 atoms/molecules/CSS, and phase-08's `pages/builder-page.tsx`.

## Implementation Steps
1. `main.tsx`: `createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)`. Nothing else.
2. `app.tsx`: import the five CSS files owned by phases 01 and 05, read `view` from `ui-store`, render `<RackPage/>` or `<BuilderPage/>`. Lazy-load the builder page with `React.lazy` — it pulls in sucrase and the LLM client, which the rack view never needs.
3. `organisms/module-panel.tsx` per the sketch above. `PanelNodeView` is a plain switch — no registry of renderers, no factory.
4. `organisms/rack-row.tsx`: horizontal flex of panels, `content-visibility: auto`, drag-to-reorder calling `rack.moveModule`.
5. `templates/rack-workspace.tsx`: nav (rack | builder, builder disabled without a key), the single `aria-live` region, gesture-resume on first pointerdown, the cable canvas, and the three modals.
6. `organisms/module-browser.tsx`: `filterModuleDefs(defs, query, cat)`, autofocused search, Escape closes, Enter adds the highlighted module, category chips coloured from `CAT_COLOR`. User modules appear under the `CUSTOM` category automatically because they are registered specs.
7. `organisms/patch-menu.tsx`: list/save/rename/delete from phase-01's `preset-store`, export via a download anchor, import via a hidden file input with a 2 MB cap and `isRackSnapshot` validation before `applySnapshot`.
8. `organisms/settings-dialog.tsx`: three password inputs, per-provider model select populated by `llm.listModels`, a reduced-motion override, a storage-usage line from `navigator.storage.estimate()`, and a "clear all data" button with a confirm step.
9. Tests: `module-panel.test.tsx` renders a fixture module and asserts one element per layout node plus correct ARIA on the knobs; `module-browser.test.tsx` asserts filtering by query and category; `rack-workspace.test.tsx` asserts the live region announces a completed keyboard patch.
10. Run `npm run dev` and confirm audio: add `vco` → `out`, patch, hear it. This is the first phase where that is possible.

## Todo list
- [ ] `main.tsx` + `app.tsx` (lazy builder page)
- [ ] `module-panel.tsx` with `PanelNodeView` switch
- [ ] `rack-row.tsx` + drag reorder
- [ ] `rack-workspace.tsx` (nav, live region, gesture-resume, cable canvas, modals)
- [ ] `module-browser.tsx`
- [ ] `patch-menu.tsx` (import validated + capped)
- [ ] `settings-dialog.tsx` (BYOK keys, model list, storage, clear data)
- [ ] `rack-page.tsx`
- [ ] Three tests
- [ ] Manual smoke: vco → out makes sound

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run`, **and `npm run build`** all pass.
- `npm run dev`: a `vco` patched to `out` produces audio after the first click.
- A patch can be created entirely by keyboard, and each completed patch is announced in the live region.
- Save → reload → load restores the same patch, including `seq`'s `ext` state.
- No Zustand selector returns a freshly-constructed object or array.
- The builder nav item is disabled with a visible hint when no API key is stored.

## Conflict Prevention
Runs beside phase 08 only. Phase 08 owns `pages/builder-page.tsx`, `templates/builder-workspace.tsx`, the four builder organisms, the three builder molecules, and `styles/builder.css`; this phase owns everything else in `ui/organisms|templates|pages` plus the two root files. `app.tsx` imports `./ui/pages/builder-page` — agree that path up front so both phases can land independently; this phase must not create a stub for it.

## Risk Assessment
- **Re-render storms** (high): the single likeliest performance failure. Every panel subscribing to a broad selector turns one knob turn into 40 panel re-renders. Use `selectModuleRevision(uid)` per panel and verify with the React DevTools profiler before calling this phase done.
- **`getBoundingClientRect` in the cable draw loop** (high): O(cables) layout thrash per frame. Rects must be cached at jack-register time.
- **Panel layout looks wrong** (medium, user-visible): computed geometry replaces hand-placed coordinates, so some modules will look cramped. Fix `panel-layout.ts` rules generically — do not add per-module special cases, which is exactly the trap `panel-runtime-model.ts` fell into.
- **Autoplay policy** (medium): forgetting `resume()` on first gesture yields a silent app with no error. Covered by the manual smoke step.
- **Lazy builder chunk** (low): if `React.lazy` is skipped, sucrase and the LLM client land in the main chunk.

## Security Considerations
- **API key input**: `type="password"`, `autoComplete="off"`, never rendered back as plain text, never logged, never included in a thrown error. On "clear all data", remove the keys from storage as well.
- **Patch import** is the untrusted-input boundary in this phase: cap the file at 2 MB, `JSON.parse` in a try/catch, run `isRackSnapshot`, reject unknown `mtype` ids, and run each module's `serialize.validate` before `load`. Never `applySnapshot` unvalidated data.
- **Module labels/names** may come from user-authored modules — render as text nodes, never `dangerouslySetInnerHTML`, and never concatenate a def string into a `style` attribute.
- **No inline scripts** in anything this phase emits; the CSP forbids `unsafe-inline`.

## Next steps
Feeds phase 09.
