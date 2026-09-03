# Phase 06 — Accessibility verification, release smoke and docs

## Context links

- Open questions: `plans/open-questions.md` (keyboard patching with a real screen reader; OpenAI image CORS)
- Docs to update: `README.md`, `docs/system-architecture.md`, `docs/code-standards.md`,
  `docs/development-roadmap.md`, `docs/project-changelog.md`
- Repo-settings checklist: phase 03 "Related code files"
- Memory rule: keep OUT level low; never auto-patch VCO → OUT in a live smoke test

## Overview

Priority P1. Status: docs done 2026-09-03; the browser, screen-reader and publish steps are
open and listed in `plans/open-questions.md`. Runs after every other phase has merged. Verifies the release in a browser and
with assistive tech, performs the first public push, and brings the docs in line with what shipped.

## Key insights

- The two unverified questions from the rework both need a human at the machine: a screen reader session
  (VoiceOver is on every Mac) and a live OpenAI key for the image CORS check. Both are ten-minute checks.
- `plans/` and the git history carry local absolute paths (audit S10). Publishing them is a privacy
  preference, not a vulnerability; the plan defaults to keeping history and scrubbing the seven files unless
  the user picks the squash option.
- The README's security section and the architecture doc both describe `localStorage` keys; phase 02 changed
  the default.

## Requirements

- Functional: live site loads at the Pages URL, worklet runs, patches save/load, a user module registers,
  the DIST module appears; screen-reader walkthrough of arm → destination → patched and Delete → removed.
- Non-functional: Lighthouse accessibility ≥ 95 on the rack view; zero console errors or CSP messages on the
  live site; docs describe the shipped behaviour with no stale counts or storage claims.

## Architecture

No code beyond doc edits and, if the a11y sweep finds something, one-line fixes in the files phase 05 owned.

## Related code files

- Modify: `README.md` (module count, deploy section, key-storage paragraph, CI badge), `docs/system-architecture.md`
  (CSP block, storage table with session keys, deployment paragraph), `docs/code-standards.md` (CI is the
  gate), `docs/development-roadmap.md` (this plan as phase 10, statuses), `docs/project-changelog.md`
  (Unreleased → 0.2.0), `plans/open-questions.md`, `plans/reports/coderabbit-260903-0800-signaly-review.md`
  ("landed" column), the seven `plans/` files with local paths (scrub to `<repo>`)
- Create: none
- Delete: none

## Implementation steps

1. **Privacy scrub** (decision S10): replace `/Users/<name>/Developer/clem/signaly` with `<repo>` in the seven
   plan files; drop the account/plan-tier sentence from the CodeRabbit report header. If the user chose to
   squash history, create an orphan branch with one commit and push that instead (write the exact commands
   into this step when the choice is made).
2. **Local release rehearsal**: `npm run build -- --base=/<repo>/ && npm run preview`; run the phase 02 CSP
   checklist once more on the merged tree; Lighthouse desktop (performance, accessibility, best practices);
   axe DevTools on the rack and the builder views. Fix one-liners in place; anything larger becomes an issue
   under `.scratch/<feature>/` per `docs/agents/issue-tracker.md`.
3. **Screen reader**: VoiceOver on Safari and Chrome — Tab to a jack, Enter arms it, announcement heard,
   Enter on a compatible input patches, Delete on the jack removes the cable, Escape cancels. Record the
   transcript of announcements in `plans/open-questions.md` and close the question or file the gap.
4. **OpenAI image CORS**: with a real key, generate one faceplate. Close the question either way; if CORS
   blocks it, remove OpenAI from `IMAGE_ORDER` and say so in the README table.
5. **First public push** (user confirms before this runs): `gh repo create <name> --public --source=.
   --remote=origin --push` from `main` after merging this branch. Walk the repo-settings checklist from phase
   03. Wait for `ci` and `pages` to go green.
6. **Live smoke** at the Pages URL: cold load with the console open; add VCO, SVF, OUT with LEVEL at 0.1;
   patch by keyboard; save, reload, load the patch; open Settings, paste a key (if available), list models;
   import a user module JSON; confirm DIST is in the browser list. Note the second-visit Network tab: the
   `react-*.js` chunk must come from cache.
7. **Docs**: README module count 41, "Deploy" section (Pages URL, `--base`, how CI gates merges), key-storage
   paragraph (session default, remember opt-in, Gemini header, and the sentence that every Pages site under
   one account shares the `<user>.github.io` storage origin — a custom domain is the only isolation), CI
   status badge. Architecture doc: CSP
   directive list as shipped, storage table row for `sessionStorage`, one paragraph on deployment. Changelog
   0.2.0 with the audit finding ids. Roadmap: add this plan's phases with dates. Code standards: "the gate
   runs in CI; a red check blocks merge".
8. Commit as `docs: release 0.2.0 — deploy, security posture, verification notes`; tag `v0.2.0`.

## Todo list

- [x] Privacy scrub — the working tree is clean; the history stays a user decision
- [ ] Rehearsal: CSP checklist, Lighthouse, axe; one-liners fixed
- [ ] VoiceOver walkthrough recorded; open question closed or narrowed
- [ ] OpenAI image CORS answered with a real key
- [ ] First public push + repo settings checklist (user confirms)
- [ ] Live smoke at the Pages URL, cache hit on second visit
- [x] README, architecture, standards, roadmap, changelog, open questions updated
- [ ] Tag `v0.2.0` (and bump `package.json`, still `0.1.0`)

Every unticked box needs a person at the keyboard and is written up under
"Production readiness — 2026-09-03" in `plans/open-questions.md`.

## Success criteria

- Live URL works on Chrome, Firefox and Safari with the console clean.
- Lighthouse accessibility ≥ 95; the two open questions are closed or replaced by concrete issues.
- Every number in the docs (modules, tests, chunk sizes) matches the shipped build.

## Risk assessment

- **Browser floor**: the build targets Vite's default (`baseline-widely-available`); state that floor in the
  README rather than a hand-picked Safari version. `OffscreenCanvas.convertToBlob` (faceplate crop) needs
  Safari 16.4 and already fails with a user-facing message below that; a browser under the build floor shows
  the error boundary from phase 02 rather than a blank page.
- **Pages propagation**: the first deploy can take a few minutes to serve; do not debug a 404 for the first
  five minutes.

## Security considerations

- The push is the moment everything in the tree becomes public: run the secrets grep from the audit one last
  time on the exact commit being pushed (`git log -p | grep` for `sk-`, `AIza`, `ghp_`, private keys).
- Confirm secret scanning + push protection are on before inviting collaborators.

## Next steps

Post-release: watch Dependabot PRs, CodeQL results and the Pages deploy for a week. Candidates for a later
plan, not this one: streaming LLM output, Playwright smoke in CI, custom domain.
