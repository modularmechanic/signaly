# Phase 04 — runtime and bundle performance, before/after

Measured 2026-09-03 in the worktree `feature/github-pages-production-readiness-1dce56`, on top of
phases 01–03 and 05. Every number below comes from a run that actually happened; anything estimated
or unobtainable says so.

## Method

- Build: `npm run build`, served with `npm run preview` (port 4173), driven through Chrome DevTools
  MCP. Production build, no CPU or network throttling.
- Reference patch: `plans/reports/perf-260903-reference-patch.signaly.json` — VCO → SVF → VCA → OUT,
  LFO tri → SVF FREQ CV, CLOCK 1 → ADSR gate → VCA CV 1, VCO saw → SCOPE IN 1, OUT with SPECTRUM on,
  CLOCK running. **OUT LEVEL is stored at its minimum (0)** so loading it can never make noise.
- Conditions, identical before and after: viewport 1512×900 emulated at **DPR 2**, 8 modules, 8 cables,
  pointer parked at (760, 500) over a bare panel area, display refreshing at 144 Hz (so a frame budget
  of 6.9 ms, not 16.7 ms — the targets below are still stated against the ≤ 3 ms figure in the spec).
- Per-draw costs come from `performance.now()` probes temporarily added inside `ScopeDisplay.draw`,
  the cable-canvas `draw`, and `ModulePanel`'s render, on top of *both* builds. The probes were
  removed for the final build (`grep` for `__rec`/`__perf` in `src/` is empty).
- The A/B was run **A → B → A** with a rebuild and reload between each, because the machine was
  shared with other agents and the first before/after pair drifted; only the interleaved numbers are
  reported.

### Deviations from the spec's stated method

| spec asked for | what was actually done | why |
|---|---|---|
| React Profiler commit count during a knob drag | exact `ModulePanel` render count from a temporary probe, over 60 keyboard param changes one per frame | the profiler build of React is not in the production bundle and the DevTools React panel is not drivable over CDP. The probe counts the same thing the profiler would (panel renders per param change) and is exact, not sampled. |
| a pointer drag | 60 `ArrowUp`/`ArrowDown` keydowns on the SVF CUTOFF knob, one per animation frame | `setPointerCapture` on a synthetic pointer id throws, and CDP's drag helper emits a single move. The keyboard path calls the identical `commit()` → `setParam` → store update, so the re-render cascade is the same. |
| Lighthouse desktop performance score | **not obtainable.** The `lighthouse_audit` MCP tool explicitly excludes the performance category. LCP is reported instead, from a real navigation trace. | tooling limitation |
| 60 Hz display | 144 Hz | that is the machine |

## Targets

| # | target | before | after | met? |
|---|---|---|---|---|
| 1 | render-bus frame cost ≤ 3 ms on a typical frame | **0.104 ms** mean `FireAnimationFrame` (n = 3031 over 21.1 s) | **0.055 ms** mean (n = 2995 over 20.8 s) | yes, before and after; **−47 %** |
| 2 | knob drag: one commit for the knob, panel does not re-render | **60 `ModulePanel` renders per 60 param changes** | **0** | now yes; was a clear miss |
| 3 | idle rack, pointer parked: cable `draw` ≤ 0.2 ms/frame | **0.0334 ms/frame** (6 runs of 6 s, range 0.0282–0.0358) | **0.0253 ms/frame** (3 runs of 6 s, range 0.0228–0.0279) | yes, before and after; **−24 %** |
| 4 | no chunk over 300 kB raw, zero build warnings | largest chunk 222.81 kB, 0 warnings | largest chunk 222.81 kB, 0 warnings | yes, unchanged |

Whole-main-thread scripting over the same idle window: **3.44 % → 1.85 %** (total `RunTask`
725.0 ms / 21.07 s → 385.4 ms / 20.82 s).

## Detail

### Per-draw cost, idle rack (ms per frame, mean of 3 × 6 s runs each)

| probe | before | after | delta |
|---|---|---|---|
| `ScopeDisplay.draw` | 0.0626 (runs: .0625 .0623 .0630 / .0647 .0624 .0609) | 0.0285 (runs: .0287 .0286 .0281) | **−54 %** |
| cable-canvas `draw` | 0.0334 (runs: .0348 .0345 .0346 / .0358 .0324 .0282) | 0.0253 (runs: .0279 .0253 .0228) | **−24 %** |
| `hitTest` calls per 864 frames | 864 | **1** | −99.9 % |
| `ModulePanel` renders, idle | 0 | 0 | — |
| rAF-probe pump cost (rAF timestamp → callback after the pump) | 0.579 / 0.616 ms | 0.598 ms | inside noise; see note |

Note on the rAF probe: it measures elapsed time from the frame's rAF timestamp to a callback
registered after the render bus, so it carries the browser's dispatch latency and moves with machine
load (it read 0.388 ms on an early idle run and 0.6 ms twenty minutes later on *unchanged* code).
It is reported for completeness only; the `FireAnimationFrame` figures in the target table come from
the trace and are the ones to trust.

### Knob drag, 60 param changes one per frame

| | before | after |
|---|---|---|
| `ModulePanel` renders | 60, 60, 60 (and 60 in every one of 8 further passes) | 0 in all 11 passes |
| mean synchronous time inside one `keydown` dispatch | 0.128 ms (mean of 8 passes) | 0.142 ms (mean of 8 passes) |

The commit-time row is **not a real difference**: `performance.now()` is clamped to 100 µs in this
context, every per-event sample is 1–2 ticks, and the 14 µs gap is a seventh of one tick. The render
count is exact and is the number that matters.

### Load

| | before | after |
|---|---|---|
| LCP (navigation trace, localhost, no throttling) | 82 ms | 75 ms |
| TTFB | 2 ms | 1 ms |
| CLS | 0.02 | 0.02 |

Not comparable to a real deployment — this is loopback with no latency. Recorded only to show the
changes did not regress load.

### Bundle (final build, `vite build`, gzip in brackets)

| chunk | bytes |
|---|---|
| `builder-page` | 222.81 kB (54.34) |
| `react` | 189.59 kB (59.61) |
| `index` | 98.28 kB (30.26) — was 98.05 kB before this phase, +0.23 kB |
| `worklet-entry` | 37.61 kB |
| `index.css` / `builder-page.css` | 25.21 kB (6.25) / 2.88 kB (0.93) |
| `client` (LLM) | 16.02 kB (6.77) |
| `panel-layout` | 4.29 kB (2.14) |
| `rolldown-runtime` | 0.71 kB (0.42) |

Zero warnings. Largest chunk 222.81 kB < 300 kB.

## Verdict on each change

| change | measured effect | kept? |
|---|---|---|
| `scope-display.tsx`: decimate to one min/max column per CSS pixel, drop `shadowBlur` for a 3 px alpha-0.25 under-stroke | 0.0626 → 0.0285 ms/frame, −54 %, ranges do not overlap across 6 runs | **kept** |
| `module-panel.tsx`: drop `useRackStore(selectModuleRevision(uid))` | 60 → 0 panel renders per 60 param changes | **kept** |
| `cable-canvas.tsx`: gate `hitTest` on a `moved` flag | 864 → 1 hit-tests per 864 idle frames; `draw` 0.0334 → 0.0253 ms/frame, −24 %, ranges do not overlap | **kept** |

Nothing was reverted. Every one of the three moved its number outside the run-to-run spread. The
honest caveat is that targets 1, 3 and 4 were **already met before the phase** — the scope and cable
work cuts a cost that was never over budget on this machine. What the phase actually found broken was
target 2.

### Correctness checks on the kept changes

- Scope trace before/after, same patch, same DPR: visually equivalent — same saw shape, same colour,
  the blur halo replaced by a tighter under-stroke. Canvas dumps: `perf-260903-scope-before.png`,
  `perf-260903-scope-after.png` (the scope canvas at DPR 2, 434 × 92 device px, same signal).
- Min/max per bucket: a single-sample transient still reaches full height, because each column emits
  both the bucket minimum and maximum as two vertices.
- `moved` is also set on `pointerleave`, on `resize`, and on any rack mutation (the `scroll` listener
  was re-pointed from `invalidateJackRects` to `reflow` for the same reason), so a hover cannot get
  stuck when the cables move under a stationary pointer. Verified live: hovering a cable lights
  `body.cable-hover`; moving away clears it; removing a module under a parked pointer clears it.
- Knob still updates with the panel subscription gone: CUTOFF 800 Hz → 3.99 kHz, `aria-valuetext`
  and the cap rotation both follow.
- `mix8.parts.tsx` subscribes to `selectModuleRevision` itself and `seq.parts.tsx` reads only worklet
  feeds, so nothing depended on the panel-level subscription. `selectModuleRevision` stays exported.

## Gate

| gate | result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean (`--max-warnings 0`) |
| `npm test` | 281 passed / 53 files, 0 failed |
| `npm run build` | ok, 0 warnings |
| `npx prettier -c` on the three touched files | clean |

`npm run format:check` reports 32 pre-existing files repo-wide; none of them are the files this phase
touched.

## CSP checklist on the production build (phase 02's deferred step)

DevTools console watched for the whole session, production `vite preview` build, CSP delivered by the
`<meta>` tag in `index.html`.

| step | CSP violations |
|---|---|
| cold load | **none** |
| add a worklet-backed module (VCO, via + Module → search → VCO) | **none** |
| import a patch from a JSON file (the reference patch, twice) | **none** |
| load a saved patch from the Patches menu | **none** |
| add a user module from JSON | **could not reach it.** The Builder tab is disabled without an API key ("Add an API key in Settings to use the builder"), and `UserModuleLibrary` — the only JSON import for modules — lives inside it. |

Because the user-module path could not be driven, its CSP surface was probed directly from the page
instead: a `blob:` URL was registered as an `AudioWorklet` module (`audioWorklet.addModule`) and as a
module `Worker`. **Both succeeded, no violation** — so `script-src 'self' blob:` and
`worker-src 'self' blob:` do cover what a user module needs. Caveat: this exercised the directives,
not the app's own `runtime-registry` code path, and the probe script itself was injected over CDP.
Someone with an API key should still walk the real builder flow once.

**Console errors of any kind on the production build: none.** The only console entry across the
entire session was a repeated Chrome *issue* (not an error, not CSP):

> A form field element should have an id or name attribute

It comes from the Patches dialog — the patch-name textbox and/or the file input carry an
`aria-label` but no `id`/`name`. Cosmetic, but it is a real accessibility/autofill nit and belongs
with the other a11y findings, not here.

## Open

- Lighthouse performance score is not obtainable with the available MCP tooling. If the number is
  wanted for the changelog, it needs a Lighthouse CLI run.
- Every runtime figure here is from one machine at 144 Hz with DPR 2. A 60 Hz / DPR 1 machine has
  roughly a quarter of the per-frame canvas work and twice the budget, so the targets hold there too;
  a low-end machine was not tested.
