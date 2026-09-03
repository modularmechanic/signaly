# Phase 02 — Security hardening

## Context links

- Audit: `plans/reports/audit-260903-0939-production-readiness-findings.md` (S1–S9)
- Threat model as written: `README.md` "Bring your own key", "Running someone else's module";
  `docs/system-architecture.md` "Security boundaries"
- CSP: `index.html`; providers: `src/features/llm/providers/`; storage: `src/storage/`
- CodeRabbit findings #16, #17: `plans/reports/coderabbit-260903-0800-signaly-review.md`

## Overview

Priority P1. Status: planned. The app's trust boundaries are sound (audit S12); this phase removes the
remaining sharp edges for a public deployment: a key in URLs, keys persisted by default, a dead CSP directive,
an unverified production CSP, no request timeout, a crashable storage read, and no error boundary. Nothing
here changes the documented sandbox (AudioWorklet scope + CSP).

## Key insights

- GitHub Pages cannot send response headers, so the meta CSP is the only policy. `frame-ancestors` (and
  `report-uri`, `sandbox`) are ignored in meta delivery by spec; keeping it only produces a console warning.
- Dev works under the current CSP because Vite injects the React Refresh preamble as an inline script
  **above** the meta tag; the policy never applies to it. Production has no inline scripts, and the CSP has
  never been exercised against the production bundle in a browser.
- `'unsafe-inline'` in `style-src` stays. It exists for Vite's dev-time `<style>` injection; in production
  React assigns inline styles through CSSOM, which CSP does not govern, and the app has no HTML sink
  (`innerHTML`, `dangerouslySetInnerHTML`) that a style injection could ride on. Stripping it in the build
  would be a plugin defending against nothing — explicitly out of scope.
- Gemini accepts the key in the `x-goog-api-key` header; the query-string form is merely the one its docs
  show first.
- **Shared origin on GitHub Pages (audit S13).** Every project site under one account is served from the same
  origin, `https://<user>.github.io`, so `localStorage`, `sessionStorage` and IndexedDB are shared with every
  other Pages site that account publishes. A script on any of them can read `signaly.api-keys.v1`. Session-only
  keys change nothing for an XSS attacker on this app, but they do clear the key when the tab closes, which
  matters on shared machines and shrinks the window in which a sibling site can read it. The opt-in keeps the
  current behaviour for people who want it. The only full isolation is a custom domain (user decision, out of
  scope); the README must say so.

## Requirements

- Functional
  - Gemini requests carry no `key=` query parameter; tests assert it.
  - Keys live in `sessionStorage` unless "Remember keys in this browser" is on; toggling moves them and
    removes the other copy. `models` and the provider preference stay in `localStorage` (not secret).
  - Every provider `fetch` aborts after a fixed timeout with a user-facing message.
  - `{"v":1,"data":null}` (or any non-array) under a list key degrades to `[]`, never throws.
  - A render exception shows a recoverable screen (message + reload button); unhandled rejections surface in
    the live region, scrubbed.
- Non-functional
  - Zero CSP violations in the console on `vite preview` while: loading, adding a worklet module, adding a
    user module (blob worklet), generating a faceplate (if a key is available), importing a patch.
  - No key string ever appears in a thrown error, a notice, or a URL (existing `scrub` stays on every path).

## Architecture

```
index.html (meta CSP, production-verified)
  └─ main.tsx ── <ErrorBoundary> ── <App/>
                  window 'error' / 'unhandledrejection' → ui-store.setNotice(scrub(msg))
storage/local-json.ts   readJson(key, fallback, store = localStorage)   // list guard
storage/api-key-store   keys → sessionStorage | localStorage (settings.rememberKeys)
llm/providers/http.ts   request(): AbortSignal.timeout(TIMEOUT_MS)
llm/providers/gemini.ts headers: { 'x-goog-api-key': key }, URL without ?key=
```

## Related code files

- Modify: `index.html`, `src/main.tsx`, `src/app.tsx` (only if the boundary wraps below the root),
  `src/features/llm/providers/gemini.ts`, `src/features/llm/providers/http.ts`,
  `src/features/llm/image-provider.test.ts` (Gemini URL/header assertions), `src/storage/local-json.ts`,
  `src/storage/local-json.test.ts`, `src/storage/api-key-store.ts`, `src/state/settings-store.ts`,
  `src/ui/organisms/settings-dialog.tsx`
- Create: `src/ui/atoms/error-boundary.tsx`, `SECURITY.md`, `src/features/llm/providers/gemini.test.ts`
  (if the image-provider test does not already cover the endpoints)
- Delete: none

## Implementation steps

1. **CSP** (`index.html`): remove `frame-ancestors 'none'`; add `object-src 'none'`. Final directive set:
   `default-src 'self'; script-src 'self' blob:; worker-src 'self' blob:; connect-src 'self' <3 hosts>;
   img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'self';
   form-action 'none'`. Record in a comment why `blob:` stays (user worklets) and why `frame-ancestors` is
   absent (meta delivery ignores it; Pages sends no headers).
2. **Production CSP verification**: `npm run build && npm run preview`, open in Chrome, run the checklist in
   Requirements with DevTools console filtered to "Content Security Policy". Any violation is a bug in this
   phase, not a reason to widen the policy.
3. **Head tags for phase 03** (`index.html`): add `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
   and `<meta name="description" content="…">` (one sentence from the README's first line). Vite rewrites
   the href under `--base`. Phase 03 supplies `public/favicon.svg`; if it has not landed yet, add the tag
   anyway — a 404 favicon is what ships today.
4. **Gemini header** (`gemini.ts`): `endpoint(model, method)` without the key; `postJson`/`getJson` get
   `{ 'x-goog-api-key': key }`. Update the "key rides in the query string" comment in `http.ts` (`request`
   still never quotes the URL back — keep that). Test: mock `fetch`, assert the called URL has no `key=` and
   the header is present, for `chatJson`, `listModels` and `image`.
5. **Fetch timeout** (`http.ts`): `const TIMEOUT_MS = 120_000` (image generation is the slow path); pass
   `signal: AbortSignal.timeout(TIMEOUT_MS)` in `request`. Restructure the existing catch-all around
   `fetch`: inspect `e.name` first — `'TimeoutError'` or `'AbortError'` becomes
   `"${what} did not answer within 120 s"`; everything else keeps the current "could not be reached" text.
   Without that split the timeout would be swallowed into the network message. Test: the `fetch` mock must
   honour `init.signal` — return a promise that rejects with `signal.reason` on the signal's `abort` event —
   then advance fake timers past `TIMEOUT_MS` and assert the timeout message. A mock that ignores the signal
   never rejects and the test can never pass.
6. **List guard** (`local-json.ts`): `readJson` unchanged in signature; add `readList<T>(key): T[]` that
   returns `[]` unless `Array.isArray(data)`, and use it in `patch-store.ts` and `user-module-store.ts` —
   two call sites. Test the `{"v":1,"data":null}` case (CodeRabbit #16).
7. **Session-only keys** (`api-key-store.ts`, `settings-store.ts`, `settings-dialog.tsx`):
   - `settings.rememberKeys: boolean` (default `false`), persisted with the other settings.
   - `local-json.ts`: `readJson`/`writeJson`/`removeJson` take an optional `store: Storage` (default
     `localStorage`). `api-key-store` picks `rememberKeys ? localStorage : sessionStorage` for `keys` only;
     `models` stay in `localStorage` under the existing envelope.
   - Toggling the setting moves existing keys to the other store and removes the old copy. Turning it off
     also removes `signaly.api-keys.v1` from `localStorage`.
   - Migration for people who already have keys: on first read, if `signaly.api-keys.v1` exists in
     `localStorage` and `rememberKeys` has never been set, set `rememberKeys = true` and leave the keys where
     they are. They chose persistence under the old rules; the checkbox now shows it and can be turned off.
     Only new users get the session-only default. Never leave a key in `localStorage` while
     `rememberKeys` is `false` — that would hide a key that is still on disk.
   - Settings UI: one checkbox "Remember keys in this browser" under the API-key hint, with the hint text
     updated: "Keys are kept for this tab session unless you choose to remember them."
   - Tests: default store is session; toggle migrates; `hasAnyKey()` reads the active store.
8. **Error boundary** (`error-boundary.tsx`): class component with `getDerivedStateFromError`; renders a
   `role="alert"` block with the message and a "Reload" button. Wrap `<App/>` in `main.tsx`. Add `window`
   listeners for `error` and `unhandledrejection` in `main.tsx` that call `useUiStore.getState().setNotice`
   with `scrub`-safe text (no key can reach here, but route through `errorMessage` and cap at 300 chars).
   Keep the console untouched for developers.
9. **SECURITY.md**: 15 lines — supported version (main), how to report (GitHub private vulnerability
   reporting once enabled in phase 03), the three-sentence threat model from the README, what is out of scope
   (a hostile imported module wedging the user's own tab).
10. Full gate; commit as `feat: harden client security — header-borne Gemini key, session-only keys, fetch
    timeout, storage guard, error boundary, CSP cleanup`.

## Todo list

- [ ] CSP: drop `frame-ancestors`, add `object-src 'none'`
- [ ] Production CSP verified on `vite preview`, zero violations across the checklist
- [ ] Favicon link + description meta in `index.html`
- [ ] Gemini key in header; URL free of `key=`; tests
- [ ] `AbortSignal.timeout` in `request`, catch split on `e.name`; signal-aware fetch mock test
- [ ] `readList` guard; test for `data: null`
- [ ] `rememberKeys` setting, session-default key store, migration on toggle and for pre-existing keys; tests
- [ ] Error boundary + global handlers
- [ ] `SECURITY.md`
- [ ] Gate green; commit

## Success criteria

- Console shows no CSP warnings or violations on the production preview.
- `grep -rn "key=" src/features/llm` matches nothing outside tests that assert its absence.
- Closing the tab forgets keys unless "Remember" was ticked; ticking it survives a reload.
- A deliberately thrown error in a panel renders the boundary instead of a blank page.
- Existing 227+ tests green plus the new ones.

## Risk assessment

- **Session-only default surprises returning users**: handled by the migration rule in step 7 (existing keys
  imply `rememberKeys = true`); changelog entry in phase 06 explains the new default for new users.
- **Timeout too short for slow image models**: 120 s matches OpenAI's documented upper bound for
  `gpt-image-1`; make it one constant so it is a one-line change.
- **`AbortSignal.timeout` availability**: baseline since 2022 (Chrome 103, Firefox 100, Safari 16); inside
  Vite's default build target, so no polyfill.

## Security considerations

- The sandbox statement does not change: user DSP runs only in `AudioWorkletGlobalScope`; `FORBIDDEN` stays
  defence in depth. Do not touch `dsp-transpile.ts` in this phase.
- `x-goog-api-key` is still a bearer secret in a request header; it is only kept out of URLs, not out of the
  network tab. The README's "a client-side app cannot hide a key" sentence stays true and stays, and phase 06
  adds the sentence about the shared `<user>.github.io` origin next to it.
- The error boundary must never print `localStorage`/`sessionStorage` contents or request bodies.

## Next steps

Phase 06 updates README ("Bring your own key" → session default, remember opt-in) and
`docs/system-architecture.md` (CSP block, storage table). Phase 03 enables private vulnerability reporting so
`SECURITY.md`'s link resolves.
