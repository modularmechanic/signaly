---
title: "Signaly: production readiness and GitHub Pages release"
description: "Fix the fresh-clone blockers, harden the client-side security posture, add CI + Pages deploy, measure-then-optimise the hot paths, clear the open review findings"
status: planned
priority: P1
effort: 16h
branch: feature/project-optimization-production-72eb1e
tags: [release, security, performance, ci, github-pages]
created: 2026-09-03
---

# Signaly — production readiness

Evidence: `plans/reports/audit-260903-0939-production-readiness-findings.md` (finding ids H*, S*, D*, P* below
refer to it). Gate today on a fresh clone: typecheck, lint, build and `npm audit` clean; **1 test red** because
the DIST module is git-ignored (H1). No CI, no deploy, no LICENSE.

## Phases

| # | phase | status | group | effort | link |
|---|---|---|---|---|---|
| 01 | Repo hygiene and release blockers (H1–H5) | done | 1 | 1.5h | [phase-01](phase-01-repo-hygiene-and-release-blockers.md) |
| 02 | Security hardening (S1–S9) | done | 2 | 3h | [phase-02](phase-02-security-hardening.md) |
| 03 | GitHub Pages deploy + CI + supply chain (D1–D4, S9) | done | 2 | 2.5h | [phase-03](phase-03-github-pages-deploy-and-ci.md) |
| 04 | Runtime and bundle performance, measure first (P1–P4) | planned | 2 | 3h | [phase-04](phase-04-runtime-and-bundle-performance.md) |
| 05 | Known defects from the CodeRabbit pass | done | 2 | 4h | [phase-05](phase-05-known-defects-from-review.md) |
| 06 | Accessibility verification, release smoke, docs | docs done | 3 | 2h | [phase-06](phase-06-accessibility-verification-and-docs.md) |

## Dependency graph

```
01 hygiene ──┬── 02 security ─────┐
             ├── 03 deploy + CI ──┤
             ├── 04 performance ──┼──► 06 verify + docs + first public push
             └── 05 defects ──────┘
```

Group 1 solo (01 turns the gate green). Group 2 runs 02, 03, 04, 05 in parallel — the ownership matrix below
keeps their files disjoint. Group 3 solo: 06 is the only phase that edits `README.md` and `docs/`.

## File ownership

| phase | exclusive paths |
|---|---|
| 01 | `.gitignore`, `.nvmrc`, `LICENSE`, `package.json`, `src/modules/dist/`, `src/storage/image-store.ts`, `src/ui/organisms/settings-dialog.tsx` (clear-data button only) |
| 02 | `index.html`, `SECURITY.md`, `src/main.tsx`, `src/app.tsx`, `src/ui/atoms/error-boundary.tsx`, `src/features/llm/providers/{gemini,http}.ts` + tests, `src/storage/{api-key-store,local-json}.ts` + tests, `src/state/settings-store.ts`, `src/ui/organisms/settings-dialog.tsx` (key rows only, after 01) |
| 03 | `vite.config.ts`, `.github/**`, `public/**` |
| 04 | `src/ui/molecules/{scope-display,cable-canvas}.tsx`, `src/ui/organisms/module-panel.tsx`, `plans/reports/perf-*.md` |
| 05 | `src/modules/**`, `src/engine/{dsp-prelude,snapshot}.ts` + tests, `src/hooks/{patch-state,formatters}.ts`, `src/ui/atoms/{mini-piano,switch}.tsx`, `src/ui/organisms/module-browser.tsx`, `src/ui/templates/{builder-workspace,rack-workspace}.tsx` |
| 06 | `README.md`, `docs/**`, `plans/open-questions.md`, `CONTEXT.md` |

`settings-dialog.tsx`: 01 (one line) lands before 02 (key rows). `vite.config.ts` is 03's alone (`manualChunks`
lives there). `index.html` is 02's, which adds the favicon link and description meta for 03's `public/favicon.svg`.

## Key decisions

- **Release gate** = typecheck, lint, test, build, `npm audit --audit-level=high`; CI enforces it on every push and PR.
- **Base path via the build flag**, not config: `npm run build -- --base=/<repo>/` in the Pages workflow. Nothing
  in the app assumes `/`; local builds stay at `/`.
- **CSP stays a meta tag** (Pages cannot send headers). Drop the ignored `frame-ancestors`, add `object-src
  'none'`, keep `script-src 'self' blob:` (user worklets need `blob:`) and keep `style-src 'unsafe-inline'`:
  React sets styles through CSSOM and the app has no HTML sink, so stripping it in the build buys nothing.
- **API keys default to session-only** with an explicit "remember in this browser" opt-in; Gemini's key moves
  from the query string to the `x-goog-api-key` header. The deciding argument is S13: every project site under
  one GitHub account shares the `<user>.github.io` origin and therefore its storage. Only a custom domain
  isolates it, which is the user's call and out of scope here.
- **Measure before optimising** (phase 04): every change ships with a before/after number from the same trace.
- **Fewest new files**: no PWA manifest, no `404.html`, no `.nojekyll`, no service worker — none is needed.

## Out of scope

Backend or proxy for keys, streaming LLM output, E2E test suite, custom domain, analytics, i18n, PWA/offline.

## Unresolved questions

Tracked in [../open-questions.md](../open-questions.md) under "Production readiness — 2026-09-03": license
choice and DSP provenance (H2), whether `plans/` and history go public as-is (S10), project vs user Pages site
(D1), custom domain to isolate the storage origin (S13). Critic-reviewed 2026-09-03: claims confirmed, phase 02
timeout test and phase 05 snapshot fix corrected, CSP style-src step dropped.
