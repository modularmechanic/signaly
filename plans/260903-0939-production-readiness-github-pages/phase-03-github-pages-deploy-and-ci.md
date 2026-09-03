# Phase 03 — GitHub Pages deploy, CI and supply chain

## Context links

- Audit: `plans/reports/audit-260903-0939-production-readiness-findings.md` (D1–D4, S9)
- Build: `vite.config.ts`, `package.json` scripts; worklet URL: `src/engine/audio-context.ts`
- GitHub docs to consult at implementation time (versions move): "Publishing with a custom GitHub Actions
  workflow", `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`,
  Dependabot `version: 2` config, CodeQL default setup

## Overview

Priority P0. Status: planned. Gives the repo a remote, a CI gate and a Pages deploy that serves the app from
`https://<user>.github.io/<repo>/`. Adds the supply-chain basics a public repo is expected to have.

## Key insights

- The only thing that breaks under a sub-path is asset resolution; `--base=/<repo>/` on the build command
  fixes it without touching config or typing `process.env` in `vite.config.ts`. The `?worker&url` import
  resolves through the same base, so the worklet loads from `/<repo>/assets/worklet-entry-*.js`.
- No routing → no `404.html`. Pages artifact deploys bypass Jekyll → no `.nojekyll`.
- Pages serves everything with `cache-control: max-age=600`; Vite's hashed filenames make that safe. A
  `react` vendor chunk means a content deploy does not invalidate the 60 kB (gzip) framework download.
- Secure context is required for `crypto.randomUUID`, `AudioWorklet` and `navigator.storage.persist`;
  Pages is HTTPS by default and "Enforce HTTPS" must stay on.
- The repo currently has no remote (`git remote -v` is empty). Creating it and pushing publishes content;
  that step is the user's call and is the last thing in phase 06, not this phase.

## Requirements

- Functional
  - `ci.yml`: on `push` (main) and `pull_request`: Node 24 from `.nvmrc`, `npm ci --ignore-scripts`,
    `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit --audit-level=high`.
  - `deploy-pages.yml`: on `push` to `main` and `workflow_dispatch`: run `typecheck`, `lint`, `test`, then
    `npx vite build --base=/${{ github.event.repository.name }}/` (the flag goes to Vite directly and the
    typecheck is not repeated), upload `dist`, deploy. Permissions `contents: read`, `pages: write`,
    `id-token: write`; `concurrency: pages`, cancel-in-progress false. Keep the base in one `env` line with
    a comment: a repo named `<user>.github.io` needs `/`.
  - `dependabot.yml`: weekly `npm` and `github-actions`, minor+patch grouped.
  - `public/favicon.svg` (a 16-line inline SVG, brand mark on black) and `<link rel="icon">` +
    `<meta name="description">` in `index.html` — hand these two lines to phase 02, which owns
    `index.html`.
  - `vite.config.ts`: `build.rollupOptions.output.manualChunks = { react: ['react', 'react-dom'] }`
    (phase 04's measurement decides whether it stays; the file is owned here).
- Non-functional
  - Actions pinned to a full commit SHA with the version in a comment; Dependabot bumps them.
  - Workflow total under 3 minutes on the free runner (`npm ci` cached via `actions/setup-node` `cache: npm`).

## Architecture

```
push main ──► ci.yml (gate) ──► deploy-pages.yml ──► build --base=/<repo>/ ──► upload dist ──► deploy-pages
PR ────────► ci.yml (gate only)
Dependabot ─► PRs weekly ──► ci.yml
```

## Related code files

- Modify: `vite.config.ts`
- Create: `.github/workflows/ci.yml`, `.github/workflows/deploy-pages.yml`, `.github/dependabot.yml`,
  `public/favicon.svg`
- Delete: none
- Repo settings checklist (manual, user): Pages source "GitHub Actions"; Enforce HTTPS; Code security →
  Dependabot alerts + security updates, secret scanning + push protection, private vulnerability reporting;
  CodeQL default setup is optional (five runtime deps, no backend — Dependabot and `npm audit` carry the
  weight); branch protection on `main` requiring the `ci` check (optional for a solo repo).

## Implementation steps

1. `vite.config.ts`: add the `manualChunks` entry. Build, confirm a `react-*.js` chunk and that `index` shrinks
   by roughly 190 kB raw. Keep `base` untouched.
2. Local sub-path rehearsal: `npm run build -- --base=/signaly/ && npm run preview`, open
   `http://localhost:4173/signaly/`, add VCO, confirm in the Network tab that the worklet chunk loads from
   `/signaly/assets/`. Set OUT level to 0 before patching anything audible. (`npm run build -- --base=…`
   reaches Vite only because `vite build` is the last command in the `build` script; add that as a comment
   above the script in `package.json` so a reorder does not send the flag to `tsc`.)
3. `ci.yml` as specified. Use `actions/checkout`, `actions/setup-node` with `node-version-file: .nvmrc` and
   `cache: npm`. Fail on any step.
4. `deploy-pages.yml` as specified; `needs` nothing — repeat the three gate steps, then the direct
   `npx vite build --base=…` call. Simpler than `workflow_call`, and the gate stays a single source of truth
   by copying the exact step list from `ci.yml`.
5. `dependabot.yml`: two update blocks, `schedule.interval: weekly`, `groups` for minor/patch.
6. `public/favicon.svg`; pass the `<link rel="icon" type="image/svg+xml" href="/favicon.svg">` and
   description meta to phase 02 (Vite rewrites the href under `--base`).
7. Dry-run the workflows locally where possible: `act` is optional; at minimum run the exact command list from
   `ci.yml` in a shell and confirm each exits 0.
8. Commit as `ci: GitHub Pages deploy, CI gate, Dependabot, vendor chunk, favicon`.
9. Hand the repo-settings checklist to the user; it runs after the first push (phase 06).

## Todo list

- [ ] `manualChunks` react vendor chunk; build verified
- [ ] Sub-path preview rehearsal at `/signaly/` with worklet loading
- [ ] `ci.yml` with the full gate + audit
- [ ] `deploy-pages.yml` with `--base=/<repo>/`
- [ ] `dependabot.yml`
- [ ] `public/favicon.svg`; head tags handed to phase 02
- [ ] Actions pinned by SHA
- [ ] Commit; settings checklist written into this file's Next steps

## Success criteria

- `npm run build -- --base=/signaly/` produces `index.html` whose script and link hrefs start with
  `/signaly/assets/`.
- After the first push: the `ci` check is green, the Pages deployment succeeds, and the site loads the worklet
  and plays a VCO → OUT patch at a low level with no console errors.
- Dependabot opens its first PRs within a week; CodeQL shows a completed scan.

## Risk assessment

- **Action version drift**: pinned SHAs go stale; Dependabot's `github-actions` block is the mitigation.
- **Free-runner time**: the test environment is jsdom (`environment` init ≈ 28 s locally); if CI exceeds 3
  minutes, cache `node_modules` rather than parallelising.
- **User site vs project site**: if the repo is named `<user>.github.io`, `--base` must be `/`. Make the base a
  workflow `env` with a comment so it is a one-line change.

## Security considerations

- `npm ci --ignore-scripts` in CI: none of the five runtime deps have install scripts today, and this blocks
  a future one from running in CI unnoticed.
- `permissions` are set per workflow to the minimum; `GITHUB_TOKEN` is never echoed.
- `npm audit --audit-level=high` fails the gate; moderate advisories are Dependabot's job.
- No secrets are needed for build or deploy; keep it that way (no API keys in CI, ever).

## Next steps

Phase 06 performs the first public push, walks the repo-settings checklist, and smoke-tests the live URL.
Phase 04 re-measures with the vendor chunk in place.
