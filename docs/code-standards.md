# Code Standards

## Files

- **kebab-case** file names (`module-panel.tsx`, `dsp-transpile.ts`).
- **< 200 lines per TS file.** One documented exception: `src/modules/reverb/reverb.dsp.ts` (288 L —
  a single Freeverb-style DSP class that doesn't split cleanly).
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

- **No allocation inside `process()`.** Pre-allocate buffers/state in the constructor or `defaults()`.
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

- DSP processor classes are instantiated **directly** (no real `AudioContext`): stub
  `AudioWorkletProcessor` and `registerProcessor` with `vi.stubGlobal(...)`, capture the class from
  the mock's call args, `new` it, and call `.process(I, O)` by hand. See
  `src/modules/vco/vco.dsp.test.ts`.
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

**The gate also runs in CI** (`.github/workflows/gate.yml`, called by `ci.yml` on every pull request
and by `release.yml` before a deploy), where it additionally runs `npm run format:check`
(`prettier -c .`) first and `npm audit --audit-level=high` last. A red check blocks the merge —
running the four locally is how you avoid finding out on the PR, not an alternative to it. Run
`npm run format` before pushing, markdown included, or `format:check` will fail the gate. `.nvmrc`
pins the Node version CI uses; `package.json` `engines` requires Node 24 or newer.

## Commits

Conventional commit format (`feat:`, `fix:`, `chore:`, …), no AI attribution in the message.

## YAGNI / KISS / DRY

Promote a DSP helper into the shared prelude only once **3 or more modules** need the identical
code (e.g. a shared one-pole coefficient helper, a shared LCG noise generator) — not on the first or
second duplicate. Two near-identical implementations that differ in units (ms vs. Hz, samples vs.
seconds) are a deliberate non-DRY: don't force a shared abstraction across a real semantic
difference.
