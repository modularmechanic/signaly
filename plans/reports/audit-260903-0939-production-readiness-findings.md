# Production-readiness audit — Signaly, 2026-09-03

Evidence base for `plans/260903-0939-production-readiness-github-pages/`. Measured in a fresh worktree
(`feature/project-optimization-production-72eb1e`, HEAD `b3581b3`) after `npm ci`, Node 24.14.0, npm 11.9.0.
No source file was changed by this audit.

## Gate on a fresh clone

| gate | result |
|---|---|
| `npm run typecheck` | clean |
| `npm run lint` | clean (`--max-warnings 0`) |
| `npm test` | **1 failed** / 226 passed, 41 files — `tests/module-catalog.test.ts` expects `dist` |
| `npm run build` | ok, 1 warning (`INEFFECTIVE_DYNAMIC_IMPORT`, idb-keyval via `settings-dialog.tsx`) |
| `npm audit` (prod and dev) | 0 vulnerabilities |
| `npm outdated` | nothing actionable (`typescript` 7 and `jsdom` 29 are not "wanted") |

Earlier reports (CodeRabbit, phase 09) ran in the main checkout where the ignored `src/modules/dist/`
files still sit on disk, which is why they saw 228 green tests.

## Bundle (`vite build`, gzip in brackets)

| chunk | bytes | note |
|---|---|---|
| `index` | 275.0 kB (85.6) | react + react-dom ≈ two thirds; app code ≈ 85 kB min |
| `builder-page` | 222.4 kB (54.2) | lazy; sucrase is most of it |
| `worklet-entry` | 36.9 kB | `?worker&url`, all 40 `.dsp.ts` |
| `client` (LLM) | 16.9 kB (7.1) | lazy |
| `panel-layout` | 12.1 kB (5.1) | shared |
| `index.css` + `builder-page.css` | 25.1 + 2.9 kB (6.2 + 0.9) | no web fonts, no external `url()` |

## Findings

Severity: **P0** blocks a public release · **P1** fix before announcing · **P2** fix soon · **info** recorded.

### Correctness and repo hygiene

| # | sev | finding | evidence |
|---|---|---|---|
| H1 | P0 | The DIST module is not in the repo. `.gitignore` line 2 is the unanchored pattern `dist`, so `src/modules/dist/` is ignored; the two files exist only in the main checkout (untracked). A fresh clone ships 40 modules and a red test. | `git check-ignore -v src/modules/dist/dist.def.ts` → `.gitignore:2:dist`; `ls src/modules` = 40 dirs; catalog test lists 41 |
| H2 | P0 | No `LICENSE`, no `"license"` in `package.json`. DSP was ported from the author's earlier project (`cablewerk-v2` / modvibez per `plans/…/plan.md`), so rights must be confirmed before publishing. | `ls LICENSE*` empty |
| H3 | P2 | README says "40 built-in" modules; changelog, catalog test and roadmap say 41. | `README.md:3`, `docs/project-changelog.md` |
| H4 | P2 | No `engines` field or `.nvmrc`; README requires Node 24+. CI has nothing to pin to. | `package.json` |
| H5 | P2 | Build warning: the "Delete everything" handler in `settings-dialog.tsx` dynamically imports `idb-keyval`, which `image-store.ts` imports statically. The import moves nothing out of the main chunk. | build log |

### Security

| # | sev | finding | evidence |
|---|---|---|---|
| S1 | P1 | Gemini API key rides in the URL query string (`?key=`) for both `generateContent` and `models`. URLs are copied into devtools, HAR exports and extension telemetry; the header form `x-goog-api-key` is supported and keeps the key out of URLs. | `src/features/llm/providers/gemini.ts` — `endpoint()` and `listModels` |
| S2 | P1 | API keys persist in `localStorage` unconditionally. Documented and accepted, but for a public deployment a session-only default with an explicit "remember in this browser" opt-in narrows the window (shared machines, tab close, and S13). | `src/storage/api-key-store.ts`, README "Bring your own key" |
| S13 | P1 | **Origin sharing on GitHub Pages.** A project site lives at `https://<user>.github.io/<repo>/`, and every other project site under the same account shares that origin. `localStorage`, `sessionStorage`, IndexedDB and CSP `'self'` are per origin, so any script on any of the user's other Pages sites (or a compromised one) can read Signaly's stored keys. Session-only keys shrink the window; the only real isolation is a custom domain, which is a user decision. | GitHub Pages URL scheme; `local-json.ts` key names |
| S3 | P1 | `frame-ancestors 'none'` is delivered via `<meta>`; the CSP spec ignores that directive in meta delivery and browsers log a warning. GitHub Pages cannot send headers, so clickjacking protection is unavailable regardless. Impact is low (no cross-origin-exploitable action), but the directive is dead weight and noise. `object-src` is not explicit. | `index.html:6-9` |
| S4 | P1 | The production bundle has never been opened in a browser under the CSP: the phase 09 checklist used the dev server only. In dev, Vite injects the React Refresh preamble as an inline script **before** the meta tag, so dev works by ordering, not by policy. | `plans/reports/integration-260902-1730-phase-09-browser-checklist.md`; `curl` of dev `index.html` |
| S5 | P2 | `style-src 'unsafe-inline'` is needed in dev (Vite injects `<style>` for CSS HMR) but not in production: Vite emits `<link>` tags and React sets inline styles through CSSOM, which CSP does not govern. Droppable for the build only. | `src/features/llm/providers/http.ts` unaffected; verify with `vite preview` |
| S6 | P2 | No request timeout on provider `fetch`; a hung provider leaves the builder's Send disabled forever. The catch-all in `request` would also swallow a future abort into "could not be reached". | `http.ts` — `request` (CodeRabbit #17) |
| S7 | P2 | `readJson` returns `env.data` unchecked; `{"v":1,"data":null}` under `signaly.patches.v1` throws in `PatchMenu`. Contradicts the "malformed payloads fall back" contract. | `local-json.ts` — `readJson`; `.filter` callers in `patch-store.ts` and `user-module-store.ts` (CodeRabbit #16) |
| S8 | P2 | No React error boundary and no `error`/`unhandledrejection` handler: a render exception is a blank page with no way out. | `src/main.tsx`, `src/app.tsx` |
| S9 | P1 | Supply chain: no CI, no Dependabot, no CodeQL, no `SECURITY.md`. Lockfile is committed and `npm audit` is clean today. | no `.github/` |
| S10 | P2 | Privacy before publishing: 7 files under `plans/` and the git history (19 commits) contain absolute paths with the macOS username; `plans/reports/coderabbit-…` names the GitHub account and plan tier. | `grep -rl '/Users/'` |
| S11 | info | Secrets scan of the working tree and full history: only the fake fixture `sk-ant-secret-value` in `anthropic.test.ts`. Clean. | `git log --all -p \| grep` |
| S12 | info | Trust boundaries hold: patch import (2 MB cap, deep `isRackSnapshot`), module import (1 MB cap, `fromRecord` → `validateUserDef`, 64 KB DSP, `FORBIDDEN` regex, offline render check, `faceplateImageId` dropped on import), images decoded via `<img>` with an 8192 px cap, `MAX_ERR` on provider messages, `scrub()` on every error path. No `innerHTML` / `dangerouslySetInnerHTML` / `eval` on the main thread. `connect-src` allow-lists exactly the three provider hosts. | grep sweep |

### GitHub Pages deployment

| # | sev | finding |
|---|---|---|
| D1 | P0 | No `base` configured. Served from `https://<user>.github.io/<repo>/`, every `/assets/…` URL and the worklet URL 404. Fix is the `--base` build flag; nothing in the app assumes `/`. |
| D2 | P0 | No `.github/workflows`, so nothing builds or deploys. No `public/` (favicon 404 on every load). |
| D3 | P1 | Repo has no remote. Pages must be enabled with source "GitHub Actions" and "Enforce HTTPS" (secure context is required for `crypto.randomUUID`, `AudioWorklet` and `navigator.storage`). |
| D4 | info | No client-side routing, so no `404.html` SPA fallback is needed; the Pages artifact action bypasses Jekyll, so no `.nojekyll` is needed. |

### Performance

| # | sev | finding | evidence |
|---|---|---|---|
| P1 | P1 | `ScopeDisplay` strokes `analyser.fftSize` (default 2048) points per frame per scope with `shadowBlur = 4`. Canvas shadow blur on a long stroked path is the single most expensive draw in the app; the trace is ~100 CSS px wide so 95 % of the points are sub-pixel. | `scope-display.tsx` — `draw` inside `ScopeDisplay` |
| P2 | P1 | `ModulePanel` subscribes to `selectModuleRevision(uid)`, so a knob drag re-renders the whole panel (every node) at pointer-move rate. Every leaf already subscribes through `useParam` / `useSwitch` / worklet feeds; `mix8.parts.tsx` reads `m.vals` directly but subscribes on its own, and `seq.parts.tsx` uses only feeds. The panel-level line is therefore deletable, pending a React Profiler confirmation that it is the one committing. | `module-panel.tsx` — the `useRackStore(selectModuleRevision(uid))` call; `module-panel-node.tsx` |
| P3 | P2 | Cable canvas hit-tests every frame while the pointer is inside the window: `distToRope` (24 samples) × cables, plus `elementFromPoint` when a cable is hovered. Fine for tens of cables; a pointer-moved flag makes it free when idle. | `cable-canvas.tsx` — `hitTest` called from `draw`, gated only on `ptr.inside` |
| P4 | P2 | No vendor chunk: react + react-dom re-download on every app deploy. `manualChunks` for `react`/`react-dom` costs three lines. | build output |
| P5 | info | Worklet → main messaging is throttled (comp every 8 blocks, gate `MSG_EVERY`, text and LEDs on change). `Lcg` overflow (CodeRabbit #2/#3) degrades noise quality — correctness, listed in phase 05. | grep of `postMessage` |
| P6 | info | CSS is cheap: two `filter: brightness` hover states, one `--grain` SVG background per panel, no web fonts, no backdrop filters. | `src/styles/*.css` |

### Accessibility (from the CodeRabbit pass, unaddressed)

`mini-piano` keys have no accessible name (#7); `isIntFmt` omits `fKey`/`fChord`/`fShape` so those knobs
are near-unusable by keyboard (#8); `Switch` moves selection without moving focus (#9); the module browser
has no Tab trap and no `aria-selected`/`aria-activedescendant` (#25). Keyboard patching is still unverified
with a real screen reader (`plans/open-questions.md`).

## Unresolved questions

1. Which license, and does the ported DSP's provenance allow it (H2)?
2. Publish `plans/` as-is, scrub the local paths, or exclude them and squash history for the first public push (S10)?
3. Project site (`/<repo>/`) or user site (`/`) on GitHub Pages — decides the `--base` value (D1).
4. Custom domain for Signaly (S13)? It is the only way to stop other Pages sites under the same account from
   sharing the app's storage origin. Out of scope for this plan unless the user wants it.

## Review note

Fact-checked by an independent critic pass on 2026-09-03: all findings confirmed against the tree; four line
references were replaced by symbol names; S13 was added on the critic's finding.
