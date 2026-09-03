## Signaly 2D modular synth rework - 2026-09-02

### Open

Both of this session's open questions — the screen-reader verification of keyboard patching and the
OpenAI image CORS posture — are still open and now live in the production-readiness list below, which
is the single list.

### Closed
- [x] A user module wider than the 120 HP row floor could never be placed — resolved by clamping `hp`
      in validation. `validateUserDef` now bounds `hp` to 1..`MIN_ROW_HP` (120), importing the constant
      from `src/state/settings-store.ts` so the two cannot drift, and says why: a module has to fit the
      narrowest row a rack can be set to. The old bound was a magic 24, which matched neither the floor
      (120) nor the ceiling (240) and was narrower than the 36 HP built-in MIX 8. The bound is the floor,
      not `MAX_ROW_HP`, because 240 HP rows are optional — only 120 is guaranteed. No browser hint was
      restored: nothing that validates can now fail to place.
- [x] CVD-safe signal palette — resolved twice. Phase 05 measured the original Okabe-Ito derivation
      with Viénot/Brettel dichromacy matrices and CIE76: protan 25.5, deutan 29.7, but tritan 3.5
      (pitch collapsed onto CV). The Blackline rework then re-derived the whole palette for a black
      ground and retuned `--kind-c` to clear tritan ≥ 15 and protan/deutan ≥ 20. Final values:
      `--kind-a #ffb02e` audio, `--kind-p #5ab4ff` pitch, `--kind-g #ff5fa0` gate, `--kind-c #68f3bf`
      CV (`src/styles/tokens.css`, which records why the spec's `#35d0a6` was rejected: deutan ΔE76
      7.8, tritan 4.9). Colour is never the only channel — ring line-style and glyph carry the kind too.
- [x] `navigator.storage.persist()` on first save — included. `src/storage/local-json.ts:33` fires it
      once, best-effort, on the first `writeJson`, with the rejection swallowed.

## Production readiness — 2026-09-03

Plan: `plans/260903-0939-production-readiness-github-pages/`. Ids refer to
`plans/reports/audit-260903-0939-production-readiness-findings.md`; `#n` to
`plans/reports/coderabbit-260903-0800-signaly-review.md`.

Phases 01–05 have landed and phase 06's documentation is done. Everything below needs a person at a
keyboard — a browser, a screen reader, a live API key, or a GitHub account — so none of it could be
closed in an agent session. Each item says what to do and who has to do it.

### Outstanding — needs the user

- [ ] **Local release rehearsal (phase 06 step 2).** *User, ~20 min, browser.*
      `npm run build -- --base=/<repo>/ && npm run preview`, open `http://localhost:4173/<repo>/`.
      Set the OUT LEVEL knob low before patching anything audible. Confirm: no CSP violation in the
      console, the worklet chunk loads from `/<repo>/assets/`, Lighthouse desktop accessibility ≥ 95 on
      the rack view, and axe DevTools clean on both the rack and the builder. One-line fixes go in
      place; anything larger becomes an issue under `.scratch/<feature>/` per
      `docs/agents/issue-tracker.md`.
- [ ] **VoiceOver walkthrough of keyboard patching (phase 06 step 3).** *User, ~10 min, macOS.*
      VoiceOver on Safari and again on Chrome: Tab to a jack, Enter arms it and the announcement is
      heard, Enter on a compatible input patches, Delete on a focused jack removes the cable, Escape
      cancels. The flow has no W3C precedent and has only ever been verified by reading the DOM live
      region, never by hearing it. Record the announcements here and either close the question or file
      the gap as an issue. Carried over unchanged from the rework session.
- [ ] **OpenAI image CORS with a real key (phase 06 step 4).** *User, ~10 min, needs a live OpenAI key.*
      Generate one faceplate through the builder. The browser CORS posture of
      `images/generations` was inferred, never observed. If it is blocked, remove OpenAI from
      `IMAGE_ORDER` and drop the "yes" from the OpenAI image column in the README table. Gemini is the
      fallback either way.
- [ ] **First public push (phase 06 step 5).** *User only — it publishes the repo.*
      From `main`, after this branch merges: `gh repo create <name> --public --source=. --remote=origin
      --push`. Run the secrets grep on the exact commit first (`git log -p | grep` for `sk-`, `AIza`,
      `ghp_`, `PRIVATE KEY`); the audit's sweep (S11) found only the fake `sk-ant-secret-value` fixture
      in `anthropic.test.ts`. Then the repo-settings checklist from phase 03: Pages source **GitHub
      Actions**; **Enforce HTTPS**; Code security → Dependabot alerts and security updates, secret
      scanning with push protection, private vulnerability reporting. Optional: CodeQL default setup,
      and branch protection on the integration branch requiring the `ci` check. Wait for `ci` to go
      green. **Nothing deploys yet** — `release.yml` publishes the site only when a GitHub release is
      published, so the site goes live at the tag step below, not at the push.
- [ ] **Integration branch name.** The workflows added in phase 03 say `master`; this worktree's
      integration branch is `main`. Whichever is right, `ci.yml`'s `branches:` list, the branch
      protection rule and the workflow comments have to agree with the repo before the first push.
- [ ] **Live smoke test at the Pages URL (phase 06 step 6).** *User, ~15 min, after the push.*
      Cold load with the console open on Chrome, Firefox and Safari. Add VCO, SVF and OUT with LEVEL at
      0.1 — never auto-patch VCO straight to OUT. Patch by keyboard, save, reload, load the patch, open
      Settings and list models if a key is available, import a user-module JSON, confirm DIST is in the
      browser list. On the second visit check the Network tab: the `react-*.js` chunk must come from
      cache. Do not debug a 404 in the first five minutes — Pages takes a while to propagate.
- [ ] **Tag `v0.2.0` and publish the release (phase 06 step 8).** *User.* `package.json` still says
      `"version": "0.1.0"`; bump it in the same commit as the tag. The changelog entry is already
      written as `## [0.2.0] — 2026-09-03`. Publishing the GitHub release for that tag is what triggers
      `release.yml` and puts the site live, so the live smoke test above happens after this step, not
      before it.
- [ ] **CI status badge in the README.** *User, one line, after the repo exists.* Deliberately omitted:
      a badge needs a repo URL that does not exist yet, and a placeholder renders as a broken image on
      the very site being published. Paste this under the README's title once the remote is real:
      `[![ci](https://github.com/<user>/<repo>/actions/workflows/ci.yml/badge.svg)](https://github.com/<user>/<repo>/actions/workflows/ci.yml)`
- [ ] **License and provenance (H2).** *User decision.* MIT shipped as the plan's default
      recommendation — `LICENSE` and the `package.json` `license` field are in the tree. The question
      behind it is still open: the DSP was ported from the author's earlier project (`cablewerk-v2` /
      modvibez), so MIT is only correct if the author holds the rights to every ported module. Confirm
      before the public push, or change the license then.
- [ ] **Git history (S10).** *User decision.* The eight files under `plans/` that carried absolute local paths
      (seven from the rework plan plus the audit report) are scrubbed to `<repo>` / `<cablewerk-v2>`, and the account and plan tier are out of the CodeRabbit
      report header. The 19-commit history is **not** rewritten — the working tree is clean but the old
      paths and the macOS username are still reachable through `git log -p`. Options: push as-is
      (default), or push a squashed orphan branch with one commit. Rewriting history is not something to
      do on an agent's initiative.
- [ ] **Project site or user site (D1).** `https://<user>.github.io/<repo>/` needs `--base=/<repo>/`,
      which is what `deploy-pages.yml` derives from the repo name today. A repo named `<user>.github.io`
      is a user site and needs `/` — one `PAGES_BASE` line either way.
- [ ] **Custom domain (S13).** Every project site under one GitHub account shares the
      `<user>.github.io` origin, so any script on any of them can read Signaly's `localStorage`,
      `sessionStorage` and IndexedDB. Session-only API keys shrink that window; only a custom domain
      closes it. Out of scope for this plan unless the user wants one.

### Blocking the new gate

- [ ] **`npm run format` over `src/`.** Phase 03 added `format:check` (`prettier -c .`) as the first
      step of `gate.yml`, and 32 files under `src/` have never been Prettier-formatted, so the gate is
      red on the current tree. One command fixes it, but it rewrites files owned by other lanes, so it
      wants to be its own commit rather than a drive-by. `README.md`, `docs/**` and `CONTEXT.md` are
      already clean; `plans/` is in `.prettierignore`.

### Deferred, recorded not fixed

- [ ] CodeRabbit #24: the `HEX` regex in `module-header.tsx` accepts 5- and 7-digit hex, which CSS
      rejects. Unreachable — its only caller passes a `CAT_COLOR` constant. Fix it when that file is
      open for another reason.
