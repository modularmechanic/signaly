# Phase 04 — Runtime and bundle performance (measure first)

## Context links

- Audit: `plans/reports/audit-260903-0939-production-readiness-findings.md` (P1–P6, bundle table)
- Render bus: `src/hooks/render-bus.ts`, `src/hooks/use-canvas.ts`
- Hot paths: `src/ui/molecules/scope-display.tsx`, `src/ui/molecules/cable-canvas.tsx`,
  `src/ui/organisms/module-panel.tsx`, `src/ui/organisms/module-panel-node.tsx`, `src/hooks/module-api.ts`
- Invariants that must survive: `docs/system-architecture.md` "Per-frame data never enters React state",
  "The store is pure"

## Overview

Priority P1. Status: planned. The architecture is already the right shape (one rAF pump, canvas draws outside
React, leaf-level store subscriptions, lazy builder chunk). This phase measures the three places the audit
flagged, fixes only what the trace confirms, and records before/after numbers. Load performance is not a
problem: 86 kB gzip on the critical path with no fonts and no third-party requests.

## Key insights

- `ScopeDisplay` draws all `fftSize` (2048) samples as a stroked path with `shadowBlur = 4`, per scope, per
  frame. Shadow blur on a stroked path is a full offscreen composite; the trace is ~100 CSS px wide, so 95 %
  of the vertices are sub-pixel. Two scopes + spectrum on OUT is a plausible patch.
- Every leaf control already re-syncs through `useParam` / `useSwitch` / worklet feeds. The extra
  `useRackStore(selectModuleRevision(uid))` in `ModulePanel` re-renders the panel (all nodes) at pointer-move
  rate during a knob drag. If the profiler confirms that nothing in the panel needs it, deleting one line is
  the whole fix. `mix8.parts.tsx` and `seq.parts.tsx` must be checked: if they read `m.vals` without a hook,
  they depend on that re-render.
- Cable hit-testing runs per frame while the pointer is inside the window, regardless of movement. A
  `moved` flag set by `pointermove` and cleared after a hit-test makes idle frames free.
- The worklet → main message rates are already throttled; nothing to do there.

## Requirements

- Functional: no visual or audible change; scopes still look like scopes (a wider low-alpha under-stroke
  replaces the blur glow).
- Non-functional targets, on the reference patch below, Chrome, 60 Hz display, DPR 2, one 10 s trace before
  and one after:
  - render-bus frame cost (Scripting in the Performance panel, `pump` self+children) ≤ 3 ms on a typical frame
  - knob drag: exactly one React commit per pointer move (the knob), the panel does not re-render
  - idle rack with pointer parked: cable canvas `draw` ≤ 0.2 ms per frame
  - bundle: no chunk over 300 kB raw, zero build warnings (independent of whether 03's vendor chunk has landed)

## Architecture

No structural change. Reference patch for every measurement: VCO → SVF → VCA → OUT, LFO → SVF cutoff,
CLOCK → ADSR → VCA, SCOPE on VCO, OUT with SPECTRUM on. Save it as a patch file under
`plans/reports/perf-260903-reference-patch.signaly.json` so the numbers are reproducible.

## Related code files

- Modify: `src/ui/molecules/scope-display.tsx`, `src/ui/molecules/cable-canvas.tsx`,
  `src/ui/organisms/module-panel.tsx` (conditional on the profiler)
- Create: `plans/reports/perf-260903-0939-before-after.md`, the reference patch file
- Delete: none

## Implementation steps

1. **Baseline**: `npm run build && npm run preview`. Load the reference patch. Record: (a) one 10 s
   Performance-panel trace — total Scripting %, `pump` self+children on a typical frame, the cable `draw`
   and each scope `paint` self time; (b) React Profiler — commits during a 2 s knob drag on SVF cutoff, and
   which components commit; (c) Lighthouse desktop once, performance score and LCP. Write the numbers into
   the before/after report. Three fixes of under twenty lines do not justify more ceremony than this.
2. **Scope decimation** (`scope-display.tsx`): compute `step = Math.max(1, Math.floor(buf.length / w))`, draw
   one vertex per `step` samples (peak-hold within the step keeps transients visible: track min and max per
   bucket and emit both). Remove `shadowBlur`; draw a 3 px stroke at `globalAlpha 0.25` in the trace colour
   first, then the 1.5 px trace. Verify visually against the baseline screenshot.
3. **Panel re-render** (`module-panel.tsx`): only if the profiler shows the panel committing on each move.
   The parts check is already done (critic pass, 2026-09-03): `mix8.parts.tsx` reads `m.vals` but subscribes
   on its own, and `seq.parts.tsx` reads only worklet feeds. So delete the
   `useRackStore(selectModuleRevision(uid))` line and the now-unused import, re-profile, and confirm the knob
   alone commits. Keep `selectModuleRevision` exported: `rack-store.test.ts` and any future display may use it.
4. **Cable idle cost** (`cable-canvas.tsx`): add `let moved = false`, set in `onMove`, and run `hitTest` only
   when `moved || drag`; clear after. `sig` still carries `hover` so a stale hover cannot survive a re-layout.
5. **Re-measure** everything from step 1 with the same patch; fill in the "after" column. Any change whose
   number did not move gets reverted — the comment budget is for measured wins only.
6. Full gate; commit as `perf: decimate scope traces, drop shadow blur, idle-free cable hit-test[, leaf-only
   panel subscriptions]`.

## Todo list

- [ ] Reference patch saved; baseline numbers recorded
- [ ] Scope decimation + blur removal; screenshot compared
- [ ] Panel subscription: profiled, then removed or moved (or documented why kept)
- [ ] Cable hit-test gated on pointer movement
- [ ] After numbers recorded; unhelpful changes reverted
- [ ] Gate green; commit

## Success criteria

- The before/after report shows every target met, or states which was missed and why.
- Screenshots of the scope before and after are visually equivalent at a glance.
- Tests unchanged and green (`knob.test.tsx`, `module-panel.test.tsx` cover the touched components).

## Risk assessment

- **Decimation hides short transients**: min/max per bucket prevents that; keep the default `fftSize`.
- **Removing the panel subscription breaks a display that read `m.vals` directly**: the step-3 check and the
  existing component tests are the guard; the fallback (subscribe in the parts component) is spelled out.
- **Measurement noise**: same machine, same patch, same trace length, one trace before and one after. A
  change whose delta sits inside the noise is reverted, not argued for.

## Security considerations

None. No new inputs, no new dependencies.

## Next steps

Numbers feed the changelog in phase 06. If the vendor chunk from phase 03 shows no caching benefit on Pages
(check the Network tab on a second visit), phase 06 may remove it.
