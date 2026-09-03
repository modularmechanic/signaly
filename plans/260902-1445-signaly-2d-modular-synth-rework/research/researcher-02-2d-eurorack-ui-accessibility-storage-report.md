# Researcher-02: 2D Eurorack UI, A11y, Storage, Audio Perf

## Summary
- Knobs: use native `role="slider"` w/ aria-valuenow/min/max/valuetext + full keyboard set; render as CSS/SVG (conic-gradient ring), not canvas — DOM a11y tree needs real elements.
- Perf: keep React out of the per-frame path. Zustand + `useSyncExternalStore`-based selectors avoid re-render; drive animated visuals (VU/scope/cable glow) via refs + rAF, not state.
- Cables/scopes → `<canvas>` (2D ctx); knobs/jacks/panels → DOM (CSS+SVG) so focus/ARIA/hit-testing stay native.
- Atomic design is trending toward **feature-first + atomic UI inside `ui/`**, kebab-case files, no barrel `index.ts` (kills tree-shaking / triggers full-module imports).
- Storage: `idb-keyval` (~500B) for image blobs/large JSON; localStorage only for small versioned JSON (5MB cap, hard sync limit). AudioWorklet: fixed 128-frame quantum today (spec allows future variable sizes — always read `.length`), no allocations in `process()`.

## 1. Accessible knob + jack/cable pattern

W3C ARIA APG slider pattern (canonical ref, no dedicated "knob" pattern — knob = slider variant): https://www.w3.org/WAI/ARIA/apg/patterns/slider/ and multi-thumb variant https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/
Key rules: `aria-valuenow` always within `aria-valuemin`/`aria-valuemax`; add `aria-valuetext` when the raw number isn't self-explanatory (e.g. "440 Hz", "+3 semitones"). Full keyboard: Arrow Up/Right = step+, Arrow Down/Left = step-, Page Up/Down = large step, Home/End = min/max. Shift+arrow = fine step is a common convention, not spec-mandated — implement in `onKeyDown`.

```tsx
<div role="slider" tabIndex={0}
  aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}
  aria-valuetext={`${v} Hz`} aria-label="Cutoff"
  onKeyDown={handleKeys}
  onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); startDrag(e); }}
  onPointerMove={dragMove} onPointerUp={endDrag}
  className="knob focus-visible:ring" />
```
Touch target: pad the hit area to ≥44px even if the visible knob is smaller (padding/pseudo-element, not the SVG art). Respect `prefers-reduced-motion` — skip CSS transition on the rotation transform, snap instantly.

Jack/cable a11y: mouse-drag-to-patch has no keyboard equivalent by default — add a **select-source → select-destination** flow: Enter/Space on a jack marks it "armed" (visually + `aria-pressed`), Enter/Space on a second jack completes the patch; Escape cancels. Announce state changes via a visually-hidden `aria-live="polite"` region ("Patched: VCO1 Out to VCF1 In"). No W3C pattern exists for patch cables specifically — this is a reasonable extrapolation from the ARIA APG "Listbox with selection" interaction model.

Color-blind-safe signal-kind palette (4 kinds: audio/pitch/gate/cv) — never rely on hue alone, pair with shape + text label on hover/focus:
- Audio → orange `#E8871E` (solid line)
- Pitch/1V-oct → blue `#3B82F6` (dashed line)
- Gate/Trigger → magenta `#D6336C` (square-wave icon)
- CV/Mod → teal `#0FA3A3` (dotted line)
This is a general Okabe-Ito-derived choice (https://jfly.uni-koeln.de/color/) adapted for 4 categories — verify with a simulator (e.g. https://www.toptal.com/designers/colorfilter) before lock-in; no single canonical "modular synth" palette exists.

## 2. Rendering & React perf

DOM+CSS/SVG for knobs, jacks, panel chrome (need focus rings, ARIA, hit-testing, hover). `<canvas>` for cables (bezier curves w/ sag) and scope/VU visualizers (high-frequency redraw, no per-element a11y need). Knob lit ring: `background: conic-gradient(...)` or an SVG `<circle stroke-dasharray>`; rotation via `transform: rotate(Ndeg)` on a child element (GPU-cheap, doesn't reflow).

React perf facts (from search, React docs model): `useSyncExternalStore` is what Zustand's `useStore` is built on (https://react.dev/reference/react/useSyncExternalStore) — React compares snapshots with `Object.is`, so a selector that returns a **stable primitive or memoized reference** skips re-render entirely; a selector returning a fresh object/array every call defeats this (see zustand thread https://github.com/pmndrs/zustand/discussions/3228). For anything running every animation frame (VU meters, scope trace, cable glow pulses), **do not put it in React state at all** — write to a ref + imperatively mutate a canvas/DOM style inside a single top-level `requestAnimationFrame` loop; let Zustand hold only user-editable/persisted state (knob values, patch graph), not live audio-derived signal data.
```ts
// live level meter — no React re-render per frame
function useMeter(analyser: AnalyserNode, elRef: RefObject<HTMLDivElement>) {
  useEffect(() => {
    let raf: number;
    const buf = new Uint8Array(analyser.fftSize);
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      const peak = Math.max(...buf) / 255;
      if (elRef.current) elRef.current.style.transform = `scaleY(${peak})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [analyser]);
}
```
CSS `contain: layout paint` on each module panel isolates reflow; `content-visibility: auto` on off-screen rack rows; `will-change: transform` only on the actively-dragged cable/knob (not globally — memory cost).

## 3. Atomic-design folder layout (React 19 + Vite)

Consensus (multiple 2025/2026 sources, e.g. https://www.robinwieruch.de/react-folder-structure/, https://dev.to/mroman7/atomic-design-pattern-how-to-set-up-your-reactjs-project-structure-44pm): pure atoms/molecules/organisms/templates/pages is out of favor solo; hybrid **feature-first with an atomic `ui/` layer** is the pragmatic 2025+ pick for a small team. Kebab-case files everywhere. Avoid barrel `index.ts` re-export files in hot paths — they defeat tree-shaking / force whole-module eval (multiple sources note real bundle-size regressions); fine only at a top-level `ui/atoms/index.ts` if the barrel is small and stable.

```
src/
  ui/                     # atomic design system — dumb, reusable, no app state
    atoms/                # knob-base, jack-dot, led, panel-screw
    molecules/            # knob-with-label, patch-jack
    organisms/            # module-panel, patch-cable-layer
  features/
    rack/                 # the eurorack grid: state, hooks, components
    patch-cables/         # cable drawing/routing logic
    modules/              # oscillator, filter, envelope... each a subfolder
      oscillator/
        oscillator-panel.tsx
        oscillator-panel.test.tsx
        use-oscillator-audio.ts
    faceplate-editor/      # image crop/scale UI
    persistence/           # indexeddb wrapper, preset (de)serialize
  audio/                  # AudioWorklet processors, node graph builders
  store/                  # zustand slices
  types/
```
Colocate `*.test.tsx` next to source (no separate `__tests__/`) — matches current React community default.

## 4. Faceplate image import + client-side storage

Crop/scale/stretch, no library — `createImageBitmap` (decodes off main thread) then `drawImage` with the 9-arg form does source-crop + dest-scale in one call:
```ts
const bitmap = await createImageBitmap(file); // from <input type=file accept="image/*">
const canvas = new OffscreenCanvas(panelW * 2, panelH * 2); // export at 2x
const ctx = canvas.getContext('2d')!;
ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height); // crop+scale/stretch
const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
```
Store the `Blob` directly in IndexedDB (no base64 data-URL bloat). `idb-keyval` is the right-sized dependency (~500B min+gzip, promise-based get/set/del) — https://github.com/bijection/idb-keyval / https://www.npmjs.com/package/localstorage-idb-keyval. Don't hand-roll unless avoiding the dependency matters more than ~15 lines saved.
```ts
import { get, set, del } from 'idb-keyval';
await set(`faceplate:${moduleId}`, blob);
const blob = await get(`faceplate:${moduleId}`);
```
localStorage: 5MB **string** quota, synchronous (blocks main thread) — fine for small JSON (presets, module defs, patch graph, API key) but never for images. Use a versioned envelope so future migrations don't corrupt old saves:
```ts
type Envelope<T> = { v: number; data: T };
localStorage.setItem('signaly:presets', JSON.stringify({ v: 1, data: presets } satisfies Envelope<Preset[]>));
```
Call `navigator.storage.persist()` once on first save to reduce eviction risk (best-effort, not guaranteed); `navigator.storage.estimate()` to show a storage-used indicator if desired.

## 5. Web Audio / AudioWorklet perf facts

- Render quantum is fixed at **128 frames** per `process()` call today (MDN: https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletProcessor/process, https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope). Spec discussion exists for variable block sizes in future (https://github.com/WebAudio/web-audio-api/issues/1503) — always read `input[0][0].length` rather than hardcoding 128.
- `process(inputs, outputs, parameters)` runs on the **audio rendering thread**, synchronously, every quantum — no allocations (no `new Float32Array`, no closures capturing new objects) inside it; pre-allocate buffers in the constructor.
- `sampleRate` is a read-only global inside `AudioWorkletGlobalScope` (https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope).
- Two ways to move parameter changes into the worklet: custom `AudioParam` (sample-accurate, automatable via `.linearRampToValueAtTime` etc., preferred for anything audio-rate) vs `port.postMessage` (async, main-thread-driven, fine for discrete/UI-rate changes like waveform-select).
- `new AudioContext({ latencyHint: 'interactive' })` for lowest latency (default for synths); context starts `suspended` in most browsers until a user gesture — call `audioContext.resume()` inside the first pointerdown/click handler.

## Recommended folder tree
See §3 above — final answer: **feature-first with `ui/{atoms,molecules,organisms}` as the shared design-system layer**, not full top-level atomic split.

## Unresolved questions
- No canonical ARIA pattern exists for patch cables — the select-source/select-destination flow above is a reasonable design, not a spec citation; UX-test with real screen-reader users if budget allows.
- Color palette above is a reasoned default, not a published "Eurorack standard" — worth a contrast/CVD-sim pass before final lock.
- Whether to also mirror IndexedDB writes to an export/import JSON file for backup (no cloud) — product decision, not researched here.
