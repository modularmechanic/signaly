# Phase 09 — integration checklist (browser observations)

Date: 2026-09-02 · Dev server: `vite --port 5179` · Browser: Claude Browser pane, output LEVEL set to 0 before every patch.

## Gate on the complete tree (after phases 01–08)
- `npm run typecheck` clean · `npm run lint --max-warnings 0` clean · `vitest run` 32 files / 180 tests · `npm run build` ok.
- Chunks: `index` 319.6 kB, `builder-page` 222.9 kB (lazy), `worklet-entry` 34.1 kB (`?worker&url`). DSP only in the worklet chunk.
- LOC ≈ 14.1K (src + tests + css). Only `reverb.dsp.ts` (281 L) exceeds 200 L — documented exception.

## Checklist
| item | observation |
|---|---|
| 40 specs registered | `tests/module-catalog.test.ts` green; every `def.worklet` matches its `registerProcessor` string (scripted cross-check). |
| Panels render from authored coords | VCO, MAIN OUT, COMB, SVF, REVERB rendered; screws, category tint, knobs, switches, jacks all positioned. 4 HP labels ellipsised ("O…", "FRE…") → fix 9. 2 HP COMB is cramped but legible. |
| Module browser | Search + category chips; Enter adds the highlighted entry and returns focus to "+ Module" (phase-06's "Enter does nothing" was the browser tool sending `Return`, not an app bug). Click adds too. "Added COMB" / "Added SVF" announced. |
| Keyboard-only patch | Enter on `SAW output` → "Armed saw output — pick a destination", 11 compatible jacks highlighted; Enter on `IN input` → "Patched VCO saw to COMB in"; both jacks report `patched` in `aria-label`; cable drawn. |
| Keyboard knob | CUTOFF slider: ArrowRight + PageUp took 800 → 2556.7 Hz, `aria-valuetext` "2.56 kHz". Home on LEVEL → 0. |
| Save → reload → load | "Saved smoke" (localStorage `signaly.patches.v1`, 411 B). After reload the rack reseeds VCO+OUT; clicking the preset name → "Loaded smoke": cable restored, LEVEL 0 restored. Enter in the name field does NOT save → fix 1. |
| Corrupt import | `snapshot.test.ts` rejects malformed snapshots; `parsePatchFile` had no direct test → fix 2. File upload cannot be driven from this browser pane. |
| Row capacity | Row width 20 HP: VCO 4 + OUT 6 + REVERB 10 = 20/20 accepted; adding VCA → "Row full — 4 HP needed, 0 free", nothing added. Header bar shows used/total. |
| Settings | Three `type=password autocomplete=off` inputs, per-provider MODELS button + model select, Row width (20–208), Reduce motion, storage estimate, Clear all data. Builder nav disabled with title "Add an API key in Settings to use the builder". |
| Builder with a real key | Not run — no key available in this session. Provider request shapes and proposal parsing are unit-tested with mocked `fetch`. |
| Faceplate import/crop | Not run in the browser (no file upload); `image-crop.test.ts` covers the 9-arg `drawImage` rect maths. Rack panel did not render `faceplateImageId` → fix 5. |
| Reduced motion | Checkbox persists to `signaly.settings.v1`; `base.css` `prefers-reduced-motion` block + `body.reduced-motion` class from app.tsx. |
| CVD | Phase 05: protan ΔE 25.5, deutan 29.7, tritan 3.5 (pitch vs CV collapse). Line style + glyph + text remain as non-colour channels → fix 8 lightens `--kind-c`. |
| Console | No errors during any step. |
| Volume | Default OUT LEVEL was 0.9 with no trim → raw VCO near 0 dBFS; user complaint. Fixed in `c3d1cdf` (−6 dB master trim, default 0.5). |

## Fix list handed to the integration executor
1. patch-menu `<form onSubmit>` so Enter saves. 2. `preset-store.test.ts` for `parsePatchFile`. 3. `func` drop dead `display: 'scope'`. 4. Generic `{t:'led',id,v}` feed for clock/lfo/clockdiv LEDs. 5. Faceplate blob rendered on `.module-panel` for `user:` ids. 6. Lazy-import the LLM client in settings-dialog (rack chunk sanity). 7. Promote `lpCoeff(hz)` (7 modules) and the LCG (3 modules, if identical) to the prelude; update prompt + README symbol lists. 8. Lighten `--kind-c` and re-measure ΔE. 9. Un-truncate knob labels on narrow panels. 10. `.seq-gate/.seq-pitch` styles present. 11. House-rule sweep.

## Deferred (recorded, not fixed)
- TPT SVF core duplicated in svf/noiselab/formant/wasp — inline in process loops; a shared class would be a behaviour-affecting refactor, not a DRY cleanup.
- Seconds-based one-pole coefficient ×3 (adsr, noiselab, snh) — differs from the ms/Hz variants; left.
- `mix.patchState` normalling described in the plan does not exist in the source; not implemented.
- `volt` uses `display: 'text'` although it also exposes an analyser.
- `--shadow`/`--highlight` tokens derived via `color-mix` in phase-05 CSS rather than defined in tokens.css.

## Unresolved questions
1. OpenAI `images/generations` browser CORS still unverified (needs a live key).
2. Keyboard patching flow unverified with a real screen reader (announcements confirmed in the DOM live region only).
