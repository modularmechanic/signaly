# Code Standards

## Files

- **kebab-case** file names (`module-panel.tsx`, `dsp-transpile.ts`).
- **< 400 lines per TS file.** Never split a file to satisfy the number alone: two files that share
  one secret are two shallow modules, which is worse than one long deep one. `engine/rack.ts` (244 L)
  is the standing example — every export shares the store, the spec table and the audio graph, so it
  stays whole.
- **No barrel `index.ts`** in hot paths — it defeats tree-shaking. (`features/llm/providers/index.ts`
  is a small named re-export map, not a barrel of the whole tree.)
- **No docblocks.** One-line `//` comments only, reserved for DSP intent or a non-obvious invariant —
  not for restating the signature.

## TypeScript

- `import type { … }` for type-only imports (`verbatimModuleSyntax` enforces this at build time).
- `strict: true`, `noUncheckedIndexedAccess: true` — index access returns `T | undefined`. Standard
  idioms: `O[0]?.[0]`, `arr[i] ?? 0`, `const x = arr[i]; if (!x) return;`.
- `noUnusedLocals` / `noUnusedParameters` / `noFallthroughCasesInSwitch` are on — no lint-only
  cleanup, the build fails on these.

## React / state

- Zustand selectors return **primitives or memoised refs**, never a fresh object/array literal per
  render (e.g. `useRackStore((s) => s.modules[uid])`, not `useRackStore((s) => ({ ...s.modules[uid] }))`).
- No `dangerouslySetInnerHTML` anywhere. Module `def` strings (names, labels) render as plain text
  nodes only.
- Audio side effects stay in `engine/rack.ts` — components call `rack.ts` functions, they never touch
  `AudioContext`/`AudioWorkletNode` directly.

## CSS

- `var(--…)` design tokens only (`styles/tokens.css`) — no hardcoded colors/spacing in component or
  module CSS.

## DSP (`<id>.dsp.ts`, `engine/dsp-prelude.ts`)

- **No allocation inside `process()`.** Pre-allocate buffers and state in the constructor.
- **Never write a `defaults()`.** Params are seeded from the Module Definition by `seedParams`
  (`engine/node-factory.ts`) before the first block, in the live rack and in the offline verify
  render alike, so a `defaults()` can only restate the def or contradict it. Read every param with
  a fallback — `const { freq = 220 } = this.p` — because a bare `this.p.x` is how a DSP renders NaN.
- Read a channel buffer's own `.length`; never assume 128 frames.
- Clamp feedback paths to a stable range before they reach a delay/filter state variable.
- Call `flush()` (from the prelude) on filter/delay state to zero denormals below `DENORMAL` (1e-18).
- Signals are **volts**: audio ±5 V, gate 0/5 V, pitch 1 V/oct with 0 V = C4.
- Worklet scope exposes exactly: `Base`, `ch`, `clamp`, `TP`, `DENORMAL`, `flush`, `blep`, `oscW`,
  `DL`, `OnePole`, `onePoleCoeff`, `lpCoeff`, `Lcg`, `ClockSync`, `SYNC_DIV`, `sampleRate` — nothing
  else. User DSP is transpiled with the same prelude inlined (`dsp-transpile.ts`), so this list is
  exhaustive for both built-in and user modules; keep it in step with the README's copy and the
  builder system prompt when the prelude gains a symbol.

## Testing conventions

- DSP processor classes are instantiated **directly** (no real `AudioContext`), through the one
  harness: `await loadProcessor('<slug>', over?)` from `tests/dsp-harness.ts` returns a live
  instance ready for `.process(I, O)`, its `p` seeded by `seedParams` from that module's own def —
  the same bag the live rack and `verifyDsp` build — with `over` standing in for a moved control.
  Do not hand-roll the boot: `registerProcessor` runs at `.dsp.ts` module scope, so the globals
  must be stubbed before the import, and the harness is what owns that ordering. Each instance
  gets its own `port.postMessage` as a `vi.fn()`; read messages off `.mock.calls`.
- Every module with a `.dsp.ts` clears one floor, enforced by `tests/dsp-smoke-sweep.test.ts`:
  run unpatched, then with silence, then with a plausible signal per input kind, and every output
  sample must be finite and within `MAX_ABS`. That bound is read out of
  `features/user-modules/dsp-verify.ts` at test time, so shipped modules and AI-generated User
  Modules clear the same number rather than two that drift. A module that legitimately needs a
  different bound is a discussion, not a threshold to lower, and the sweep carries no skip list.
  A `.dsp.test.ts` is for what a module *means* — tuning, timing, pattern — never for "it isn't
  NaN"; the sweep already covers that for all of them.
- Engine tests that need an `AudioContext` fake it with `vi.mock('../engine/audio-context', …)`
  rather than touching a real Web Audio API in jsdom.
- React component tests use `createRoot` + `act` from `react-dom` — no `@testing-library/*`.

## Gates

Before considering work done, all four must pass:

```bash
npm run typecheck && npm run lint && npm run test && npm run build
```

`typecheck` is `tsc --noEmit` (strict). `lint` is ESLint at `--max-warnings 0`. `test` is
`vitest run`. `build` re-runs typecheck then `vite build`.

## Commits

Conventional commit format (`feat:`, `fix:`, `chore:`, …), no AI attribution in the message.

## YAGNI / KISS / DRY

Promote a DSP helper into the shared prelude only once **3 or more modules** need the identical
code (e.g. a shared one-pole coefficient helper, a shared LCG noise generator) — not on the first or
second duplicate. Two near-identical implementations that differ in units (ms vs. Hz, samples vs.
seconds) are a deliberate non-DRY: don't force a shared abstraction across a real semantic
difference.
