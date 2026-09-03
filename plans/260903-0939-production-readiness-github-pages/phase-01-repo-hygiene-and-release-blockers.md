# Phase 01 — Repo hygiene and release blockers

## Context links

- Audit: `plans/reports/audit-260903-0939-production-readiness-findings.md` (H1–H5)
- Catalog test: `tests/module-catalog.test.ts`
- Main checkout holds the ignored files: `<main checkout>/src/modules/dist/{dist.def.ts,dist.dsp.ts}` (1164 B + 1170 B, untracked)

## Overview

Priority P0. Status: planned. Turns the gate green on a fresh clone and removes the two things that make a
public repo unpublishable (missing module, missing license). Everything else in the plan assumes this phase.

## Key insights

- `.gitignore` line 2 is `dist` without a leading slash, so it matches **any** directory named `dist`, including
  `src/modules/dist/`. `git check-ignore -v` confirms. The module was written in phase 03 of the rework and
  never entered history. Same latent hazard for `coverage` and `node_modules` patterns, harmless today.
- The build warning `INEFFECTIVE_DYNAMIC_IMPORT` is exactly what it says: `idb-keyval` is already in the main
  chunk through `image-store.ts`, so the dynamic import in the clear-data button buys nothing.
- README says 40 modules; the catalog, changelog and roadmap say 41 (MIX 8 landed after the README).

## Requirements

- Functional: fresh `git clone && npm ci && npm test` passes 41/41 files; DIST appears in the module browser.
- Non-functional: `npm run build` emits zero warnings; `package.json` declares `license` and `engines`.

## Architecture

No design change. One ignore rule, two module files, metadata.

## Related code files

- Modify: `.gitignore`, `package.json`, `src/storage/image-store.ts`, `src/ui/organisms/settings-dialog.tsx`
  (`README.md` is phase 06's; the module count is fixed there)
- Create: `src/modules/dist/dist.def.ts`, `src/modules/dist/dist.dsp.ts` (copied verbatim from the main
  checkout), `LICENSE`, `.nvmrc`
- Delete: none

## Implementation steps

1. **Before anything else in the whole plan**: copy `src/modules/dist/dist.def.ts` and `dist.dsp.ts` from
   the main checkout into this worktree. They exist nowhere in history and only in that one working copy.
   Do not edit them.
2. `.gitignore`: anchor the two build outputs — `/dist`, `/coverage`. Leave `node_modules` unanchored so
   nested `node_modules` directories stay ignored. Keep `.omc/`, `*.log`, `.DS_Store`, `.env*`. Then
   `git add src/modules/dist` and confirm `git status` shows both files as new.
3. Run `npm test`: `tests/module-catalog.test.ts` must pass (41 ids). Run `tests/module-contract-sweep.test.ts`
   implicitly through the same command.
4. `LICENSE`: add the chosen license text (default recommendation MIT, author + 2026). Add `"license": "MIT"`
   (or the chosen SPDX id) to `package.json`. **Blocked on the user's answer** to the provenance question; do
   every other step regardless.
5. `package.json`: add `"engines": { "node": ">=24" }`. Create `.nvmrc` containing `24`.
6. `image-store.ts`: export `clearImages(): Promise<void>` wrapping idb-keyval's `clear`. In
   `settings-dialog.tsx` replace the `import('idb-keyval')` chain with `clearImages()`; keep the
   `.catch(() => undefined).finally(() => window.location.reload())` shape.
7. `npm run build` — confirm no warning line. Run the full gate.
8. Commit as `fix: ship the DIST module, anchor build-output ignores, add license and engines`.

## Todo list

- [ ] Copy `src/modules/dist/` (two files) from the main checkout — first action of the plan
- [ ] Anchor `/dist` and `/coverage` in `.gitignore`; `node_modules` stays as is
- [ ] `npm test` green, 41 files
- [ ] `LICENSE` + `package.json` `license` (pending user decision)
- [ ] `engines` + `.nvmrc`
- [ ] `clearImages()` replaces the dynamic `idb-keyval` import; build has zero warnings
- [ ] Full gate green; commit

## Success criteria

- `git check-ignore src/modules/dist/dist.def.ts` prints nothing.
- Fresh clone: `npm ci && npm run typecheck && npm run lint && npm test && npm run build` all green, zero
  build warnings.
- `npm pkg get license engines` returns non-empty values.

## Risk assessment

- The two DIST files in the main checkout might be stale relative to later prelude changes (`lpCoeff` was
  promoted in phase 09). Mitigation: the contract sweep and catalog tests exercise `registerProcessor` and
  the def shape; run `npm test` after copying, and open DIST once in the browser in phase 06.
- License choice is the user's; nothing else waits on it.

## Security considerations

None beyond publishing hygiene: the license is what lets anyone legally run the code.

## Next steps

Unblocks every group-2 phase. Phase 06 owns the README, including the module count.
