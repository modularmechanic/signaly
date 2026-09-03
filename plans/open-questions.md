## Signaly 2D modular synth rework - 2026-09-02

### Open
- [ ] Keyboard patching flow (arm source -> arm destination -> Escape cancels) has no W3C precedent;
      still unverified with a real screen reader — the phase 09 pass only confirmed the announcements
      in the DOM live region. The flow now also carries Delete-to-disconnect on a focused jack, which
      is equally unverified.
- [ ] OpenAI `images/generations` browser CORS posture was inferred, not confirmed — no live key was
      available in any session, so the one real call never happened. Gemini image gen is the fallback.
- [ ] Nothing stops a user module declaring an `hp` wider than the 120 HP row floor. Such a module can
      never be placed: every row is at most 240 HP but the floor guarantees only 120. The module
      browser used to warn when an entry did not fit the target row (`freeHp` prop, "only N HP free"),
      and that hint was deliberately removed in `5f32a27` once adding stopped being blocked — so the
      failure would now be silent and unexplained. Options: clamp `hp` in the user-module schema,
      or restore a hint for the one case that can still fail.

### Closed
- [x] CVD-safe signal palette — resolved twice. Phase 05 measured the original Okabe-Ito derivation
      with Viénot/Brettel dichromacy matrices and CIE76: protan 25.5, deutan 29.7, but tritan 3.5
      (pitch collapsed onto CV). The Blackline rework then re-derived the whole palette for a black
      ground and retuned `--kind-c` to clear tritan ≥ 15 and protan/deutan ≥ 20. Final values:
      `--kind-a #ffb02e` audio, `--kind-p #5ab4ff` pitch, `--kind-g #ff5fa0` gate, `--kind-c #68f3bf`
      CV (`src/styles/tokens.css`, which records why the spec's `#35d0a6` was rejected: deutan ΔE76
      7.8, tritan 4.9). Colour is never the only channel — ring line-style and glyph carry the kind too.
- [x] `navigator.storage.persist()` on first save — included. `src/storage/local-json.ts:33` fires it
      once, best-effort, on the first `writeJson`, with the rejection swallowed.
