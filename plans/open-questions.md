## Signaly 2D modular synth rework - 2026-09-02
- [ ] CVD-safe signal palette (#E8871E audio / #3B82F6 pitch / #D6336C gate / #0FA3A3 CV) is a reasoned Okabe-Ito derivation, not a verified choice — needs a colour-blindness simulator pass in phase 05 before lock-in.
- [ ] Keyboard patching flow (arm source -> arm destination -> Escape cancels) has no W3C precedent; unverified with real screen readers.
- [ ] `navigator.storage.persist()` on first save — include (one line, reduces eviction risk) or skip as YAGNI?
- [ ] OpenAI `images/generations` browser CORS posture was inferred, not confirmed — verify with one live call in phase 07; Gemini image gen is the fallback.
