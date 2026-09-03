# Phase 05 — UI kit: interactive atoms, molecules, panel styles

## Context links
- Plan: [plan.md](plan.md) · Foundation: [phase-01](phase-01-foundation-engine-state-storage.md)
- Reports: [researcher-02](research/researcher-02-2d-eurorack-ui-accessibility-storage-report.md) §1–2 · [scout-01](scout/scout-01-reusable-code-map.md) §"CSS line-range map"
- Source (read-only): `cablewerk-v2/src/ui/{Knob,Fader,Switch,Jack,CableOverlay}.tsx`, `cablewerk-v2/src/index.css`

## Parallelization Info
- **Group:** 2
- **Runs with:** 02, 03, 04, 07
- **Waits for:** 01 (needs `core/types.ts`, `hooks/{patch-state,module-api,render-bus,formatters,use-canvas}`, `styles/tokens.css`, the five display atoms)

## Overview
- Date: 2026-09-02 · Priority: P2 · Implementation status: done · Review status: reviewed (phase 09 integration pass + grilling; findings landed in `45aee02`, `5d10263`, `5f32a27`)
- The Eurorack look and the accessibility contract. Interactive atoms (knob, fader, switch, button, jack, screw, label, select), the molecules that group them, the cable canvas, and the three CSS files that carry the faceplate/knob/jack/cable visual language mined from the source's 8210-line stylesheet.

## Key Insights
- **DOM for anything focusable, canvas for anything animated.** Knobs, jacks, switches, screws are DOM+CSS/SVG so focus rings, ARIA and hit-testing stay native; cables and scope traces are `<canvas>` (researcher-02 §2).
- No W3C "knob" pattern exists — a knob is the ARIA **slider** pattern: `role="slider"`, `aria-valuemin/max/now`, `aria-valuetext` whenever the raw number is not self-explanatory, `aria-label` from the knob's label. Keys: Arrow ±step, PageUp/Down ±large, Home/End min/max, Shift+Arrow fine (convention, not spec).
- Touch target ≥44px even when the visible knob is smaller — pad with a pseudo-element, never by scaling the art (researcher-02 §1).
- No W3C pattern exists for patch cables either. The flow is **arm source → arm destination**: Enter/Space arms a jack (`aria-pressed`), Enter/Space on a second jack completes, Escape cancels, and an `aria-live="polite"` region announces the result. That live region lives in phase 06's rack workspace; this phase fires the state via phase-01's `patch-state.armJack`.
- Never encode signal kind by hue alone — pair colour with line style and a text label on hover/focus (researcher-02 §1).
- `prefers-reduced-motion`: skip the knob rotation transition and snap instantly; the phase-01 `base.css` block is the hook.
- The source's `panel-runtime-model.ts` (942 L) is not being reproduced — panel geometry arrives from phase 01's `panel-layout.ts` as `PanelLayout.nodes`, and this phase's job is only to render one node kind per atom.

## Requirements
- Every interactive atom is keyboard operable and has a visible `:focus-visible` ring.
- Knob/fader values flow through phase-01's `useParam`; switches through `useSwitch`. No atom calls `rack.setParam` directly.
- No atom subscribes to per-frame audio data. Animated visuals register with `render-bus.addDraw` and mutate the canvas/ref directly.
- CSS uses custom-property tokens from `styles/tokens.css` only — no hardcoded colours in `controls.css`/`panel.css`/`cables.css`.
- CSS `contain: layout paint` on the module panel root; `content-visibility: auto` on off-screen rack rows (the class is defined here, applied by phase 06).

## Architecture

Knob atom, the accessibility contract in full:
```tsx
// src/ui/atoms/knob.tsx
<div className="knob" role="slider" tabIndex={0}
     aria-label={def.label}
     aria-valuemin={def.min} aria-valuemax={def.max} aria-valuenow={v}
     aria-valuetext={fmtValue(def.fmt, v)}          // hooks/formatters.ts
     onKeyDown={onKeys}                              // ←→↑↓ step, PgUp/PgDn large, Home/End, Shift fine
     onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); … }}
     onPointerMove={…} onPointerUp={…}>
  <div className="knob-ring" style={{ '--pct': pct }} />   {/* conic-gradient value ring */}
  <div className="knob-cap" style={{ transform: `rotate(${deg}deg)` }} />
</div>
```
Rotation on a child `transform` (GPU-cheap, no reflow); the lit value ring is a `conic-gradient` driven by a `--pct` custom property. `curve: 'log'` maps value↔angle non-linearly; keyboard steps operate in value space, not angle space.

Jack atom, keyboard patching:
```tsx
// src/ui/atoms/jack.tsx  — role="button", not slider
<button className={`jack jack-${def.kind}`} aria-pressed={isArmed}
        aria-label={`${def.label} ${dir === 'in' ? 'input' : 'output'}, ${KIND_NAME[def.kind]}${cableId ? ', patched' : ''}`}
        onKeyDown={e => { if (e.key === 'Escape') cancelArm(); }}
        onClick={() => armed ? completePatch(armed, self) : armJack(self)}
        onPointerDown={startDrag} />
```
Pointer drag and keyboard arming share one path: both end in `rack.connectCable`. While a jack is armed, `patch-state.setCompat` adds a body class so compatible jacks highlight — that is existing phase-01 behaviour, reused verbatim.

CVD-safe signal palette (tokens in `tokens.css`, applied here; colour is never the only channel):
| kind | meaning | colour | line style | glyph |
|---|---|---|---|---|
| `a` | audio | `#E8871E` | solid | ● |
| `p` | pitch / 1V-oct | `#3B82F6` | dashed | ◆ |
| `g` | gate / trigger | `#D6336C` | square-dash | ■ |
| `c` | CV / mod | `#0FA3A3` | dotted | ▲ |
Derived from Okabe-Ito; **must be run through a CVD simulator before lock-in** (researcher-02 unresolved question).

Cable canvas molecule:
```tsx
// src/ui/molecules/cable-canvas.tsx — one <canvas> for ALL cables, absolutely positioned over the rack
// draws a quadratic bezier with sag per cable; endpoints from patch-state.jackCenter(uid, dir, jackId)
// registers a single render-bus draw; never re-renders on cable value changes
```
Endpoint positions come from `patch-state.jackCenter`. Cache each jack's rect at register time and invalidate on scroll/resize rather than calling `getBoundingClientRect` per cable per frame (scout-01 unresolved Q3).

## Related code files
**Create:**
- `src/ui/atoms/{knob,fader,switch,button,jack,screw,label,select}.tsx` + `knob.test.tsx`, `jack.test.tsx`
- `src/ui/molecules/{module-header,jack-row,knob-group,cable-canvas,scope-display}.tsx`
- `src/styles/{controls,panel,cables}.css`

**Port FROM (adapt, strip docblocks):**
| target | source | notes |
|---|---|---|
| `atoms/knob.tsx` | `src/ui/Knob.tsx` (317 L) | keep drag + keyboard logic; **drop** the per-knob `AnalyserNode` CV halo (perf, scout-00) — a static CV-marker arc from the attenuverter value is enough |
| `atoms/fader.tsx` | `src/ui/Fader.tsx` | — |
| `atoms/switch.tsx` | `src/ui/Switch.tsx` | — |
| `atoms/jack.tsx` | `src/ui/Jack.tsx` | add the arm/complete keyboard flow |
| `molecules/cable-canvas.tsx` | `src/ui/CableOverlay.tsx` | keep the static-rope canvas draw; drop cable colour |
| `styles/controls.css` | `src/index.css` L4650–4701 (knobs), 4701–4768 (value/CV ring), 4768–4796 (switches), 4908–4949 (faders), 2453–3126 (coarse-pointer touch targets — mine only) | |
| `styles/panel.css` | `src/index.css` L3929–4650 (category-tinted faceplate — the core look), 4796–4807 (module canvas), 5121–5148 (trigger LED row), 5309–5412 (primitive styles), 4959–4986 (mini-piano), 5110–5121 (step ring), 5412–5453 (step sequencer), 5765–5827 (MiniPiano), 5827–5870 (EnvDisplay) | |
| `styles/cables.css` | `src/index.css` L4807–4908 (jacks), 5251–5275 (cables + tooltip) | |

**Do not port:** `panel-runtime-model.ts`, `front-panel-runtime.ts`, `RuntimePanelElements2D.tsx`, `index.css` L1–1340 (public site), 5275–5309 (presence), 6208–8210 (checkpoints, multiplayer, large custom panels).
**Modify / delete:** none.

## File Ownership
Exclusively owns `src/ui/atoms/{knob,fader,switch,button,jack,screw,label,select}.tsx` (+ their tests), `src/ui/molecules/{module-header,jack-row,knob-group,cable-canvas,scope-display}.tsx`, and `src/styles/{controls,panel,cables}.css`. Must **not** touch the five phase-01 display atoms (`led`, `step-grid`, `env-display`, `channel-meter`, `mini-piano`), `styles/tokens.css`, `styles/base.css`, anything in `src/ui/organisms|templates|pages` (06/08), or any module folder.

## Implementation Steps
1. Write `atoms/knob.tsx` first — it is the accessibility reference for every other control. Port drag maths from `Knob.tsx`, drop the AnalyserNode halo, add the full key set.
2. `knob.test.tsx` (jsdom): asserts `role="slider"` with correct `aria-value*`, that ArrowRight steps up, Shift+ArrowRight steps finer, Home/End clamp to min/max, and that `aria-valuetext` uses the `fmt` formatter.
3. `atoms/fader.tsx` and `atoms/switch.tsx` — fader reuses the knob's key handler in value space; switch is `role="radiogroup"` over its `options`, or a plain `<select>` when `options.length > 4`.
4. `atoms/jack.tsx` + `jack.test.tsx`: pointer drag and the arm→complete keyboard flow both terminate in the same connect call; Escape cancels; `aria-pressed` tracks armed state.
5. `atoms/{button,screw,label,select}.tsx` — `screw` is decorative, `aria-hidden`, pure CSS.
6. Molecules: `module-header` (name, sub, category tint), `jack-row` (a row of jacks with kind glyphs), `knob-group` (grid of knobs/faders), `scope-display` (canvas bound via `use-canvas` + `render-bus`), `cable-canvas`.
7. Write the three CSS files by mining the line ranges above. Convert every literal colour to a `var(--…)` token; add the missing tokens by raising them, not by defining them here (`tokens.css` is phase 01's).
8. Run the four kind colours through a CVD simulator; record the result in this file and adjust if any pair collapses.

## Todo list
- [ ] `knob.tsx` + test (ARIA slider contract)
- [ ] `fader.tsx`, `switch.tsx`
- [ ] `jack.tsx` + test (drag + keyboard arm/complete/cancel)
- [ ] `button`, `screw`, `label`, `select`
- [ ] Molecules: module-header, jack-row, knob-group, scope-display, cable-canvas
- [ ] `controls.css`, `panel.css`, `cables.css` from the mined ranges
- [ ] CVD simulator pass on the four kind colours

## Success Criteria
- `npm run typecheck`, `npm run lint`, `npx vitest run` pass.
- Knob test proves the full ARIA slider contract and key set; jack test proves keyboard patching reaches the same connect path as drag.
- Every interactive atom is reachable by Tab and has a visible focus ring.
- Zero literal colour values in the three CSS files — all `var(--…)`.
- No atom imports from `src/engine/` directly; all state goes through phase-01 hooks.
- Reduced-motion: knob rotation has no transition when the media query matches.

## Conflict Prevention
Runs concurrently with 02/03/04 (module folders only) and 07 (`src/features/` only) — no overlap. Phase 06 and 08 consume these atoms but are in group 3, so they start only after this phase lands. If a needed token is missing from `tokens.css`, do not add it here; hardcode nothing, raise it in the phase-09 checklist.

## Risk Assessment
- **CSS mining over-reach** (high, this phase's main cost sink): the source stylesheet is 8210 lines and only ~1800 are worth taking. Take the listed ranges, resist "while I'm here" copying, and expect the three files to land near 900 lines total.
- **Knob halo temptation** (medium): the source attached an `AnalyserNode` per knob for a live CV halo. That is one analyser per knob per module — a real per-frame cost. The static attenuverter-derived arc is the lazy-correct version; do not restore the analyser.
- **`jackCenter` per-frame rect reads** (medium): calling `getBoundingClientRect` for every cable endpoint every frame is O(cables) layout thrash. Cache on register, invalidate on scroll/resize.
- **Palette lock-in** (low but user-visible): the four colours are a reasoned default, not a standard. The simulator pass is a real step, not a formality.

## Security Considerations
- No network, no storage, no untrusted input in this phase. The one real rule: labels rendered from a module def can come from a **user-authored** module in phase 07 — render them as text nodes only, never via `dangerouslySetInnerHTML`, and never build a CSS value by string-concatenating a def field (a hostile `label` must not be able to inject into a `style` attribute). Numeric-only values may flow into custom properties.

## Next steps
Unblocks phases 06 and 08.
