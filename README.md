# Signaly

[![ci](https://github.com/modularmechanic/signaly/actions/workflows/ci.yml/badge.svg)](https://github.com/modularmechanic/signaly/actions/workflows/ci.yml)

Live at **https://modularmechanic.github.io/signaly/**

A lean, accessible, 2D modular synthesizer that runs entirely in the browser. 101 built-in Eurorack-style modules, patch cables, saved patches, and a module builder where you author new modules from a JSON definition plus a small TypeScript DSP class, optionally with help from your own LLM API key.

## Quickstart

Requires Node 24 or newer.

```bash
npm install && npm run dev
```

Open the printed URL, click anywhere to start audio, and patch `VCO` into `OUT`. On a phone or tablet, pinch the rack to zoom or use the − / + dock in the corner. Or open **Patches**, where the twenty-one examples are grouped by genre with their tempo and key: five generative ambient pieces, then four each of Deep House (128), Psy-Trance (140), Dub (70) and Warehouse Techno (145). The techno patches are arrangements rather than loops — they play intro, build, drop, breakdown and outro on their own.

## Scripts

| script                 | what it does                                        |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Vite dev server with HMR                            |
| `npm run build`        | typecheck + production bundle in `dist/`            |
| `npm run preview`      | serve the production bundle                         |
| `npm run typecheck`    | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint`         | ESLint at `--max-warnings 0`                        |
| `npm run test`         | Vitest (engine, DSP, storage, UI kit)               |
| `npm run format`       | Prettier                                            |
| `npm run format:check` | `prettier -c .`, the first step of the CI gate      |

## Author a module by hand

A module is a folder under `src/modules/<id>/` with two files: the definition, and one implementation — a worklet DSP class or a native Web Audio graph. The registry picks them up by glob, so there is nothing to register, and nothing anywhere counts the modules.

`<id>.def.ts` — the data contract:

```ts
import { att, type ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'myosc',
  name: 'MY OSC',
  sub: 'SAW',
  hp: 6,
  cat: 'SOURCES',
  worklet: 'myosc', // or `native: 'myosc'` for a Web Audio graph module
  knobs: [
    { id: 'freq', label: 'FREQ', min: 20, max: 8000, initial: 220, fmt: 'fHz', curve: 'log', cvIn: 'fm' },
    att('fm', 'FM'), // knob id defaults to 'fmA'; pass a third argument to override it
  ],
  sws: [{ id: 'range', label: 'RANGE', options: ['LO', 'HI'], initial: 1 }],
  ins: [
    { id: 'voct', label: 'V/OCT', kind: 'p' },
    { id: 'fm', label: 'FM', kind: 'c' },
  ],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: undefined, // 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text'
};
```

Jack kinds: `a` audio, `p` pitch (1 V/oct), `g` gate/trigger, `c` control voltage.

**Every knob needs an `fmt`.** It is the knob's unit and, for `fInt`, `fRate`, `fKey`, `fChord` and `fShape`, its quantisation while dragging. `FMT_RANGE` in `src/core/types.ts` bounds the range each name implies, and `checkDef` rejects a knob that leaves it. Pick the one that matches what your DSP stores: `fMs` reads the value as seconds, `fMsec` as milliseconds, and `fHz` is signed, so a negative frequency shift is fine. `fPc` renders `v * 100`.

**Attenuverters.** A CV input gets a bipolar amount knob by declaring `att(jackId, label)` in `knobs`. That is the whole declaration, the fixed ±1 range included. The engine puts a `GainNode` between the patch cable and the module input, so the knob is voltage scaling at the jack: do not scale that input again in DSP, and do not read the knob's id as a param. A jack takes at most one attenuverter; `cvIn` on the modulated knob is the display hint that pairs them.

**Displays.** Declaring a `display` is only half of it: each kind reads specific `m.ext` keys or worklet messages. `src/modules/display-contract.ts` holds that contract as code, one row per kind saying what the module must provide, and `checkDef` runs it over your def, so a screen you can never fill is a rejected module rather than a blank rectangle. If the feed goes missing at runtime the panel prints `NO <DISPLAY>` and the reason. A built-in whose `<id>.parts.tsx` draws its own screen declares `screen: true` instead of a `display` kind; declaring both is an error.

`<id>.dsp.ts` — one class, runs in the AudioWorklet thread:

```ts
import { Base, ch } from '../../engine/dsp-prelude';

class MyOsc extends Base {
  private ph = 0;
  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const voct = ch(I, 0); // inputs ordered as def.ins
    const fm = ch(I, 1); // already scaled by the attenuverter
    const { freq = 220 } = this.p; // always read with a fallback
    for (let i = 0; i < out.length; i++) {
      // read .length, never assume 128
      const f = freq * Math.pow(2, (voct?.[i] ?? 0) + (fm?.[i] ?? 0));
      this.ph += f / sampleRate;
      if (this.ph >= 1) this.ph -= 1;
      out[i] = (this.ph * 2 - 1) * 5; // audio is ±5 V
    }
    return true;
  }
}
registerProcessor('myosc', MyOsc);
```

Signals are volts: audio ±5, gates 0 or 5, pitch 1 V/oct with 0 V = C4. Allocate nothing inside `process()`.

**Parameters come from the definition.** `seedParams(def)` in `src/engine/node-factory.ts` builds `this.p` from every knob and switch before the first block — in the rack and in the offline render that verifies a user module — and live changes arrive on `this.p` between blocks. Do not write a `defaults()` method: it could only restate the definition or contradict it, and no built-in has one. Read every param with a fallback anyway (`const { freq = 220 } = this.p`): a bare `this.p.freq` is how a DSP that misses a key renders NaN.

Symbols the prelude puts in worklet scope: `Base`, `ch`, `clamp`, `TP`, `DENORMAL`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `lpCoeff`, `Lcg`, `ClockSync`, `SYNC_DIV`, `readLinear`, plus the scope's own `sampleRate`.

`<id>.native.ts` — instead of a worklet, a Web Audio graph built on the main thread. Only built-ins can be native; user modules are always worklets.

```ts
export const native: NativeSpec = {
  audio(m) {
    // called once, when the module is placed
    const g = getAudioContext().createGain();
    (m.natives ??= []).push(g); // teardown disconnects everything pushed here
    m.jacks.in.in = { node: g, idx: 0 }; // EVERY declared jack, by id, by hand
    for (const j of m.def.outs) m.jacks.out[j.id] = { node: g, idx: 0 };
  },
  param(m, id, v) {}, // live knob AND switch changes, by id; a switch arrives as its option index
  onConnectionChange(m, dir, jack, connected) {}, // optional
  dispose(m) {}, // optional; stop sources you started
};
```

`makeNode` throws when `audio()` leaves a declared jack unfilled, because every miss is otherwise silent: a cable to an unfilled jack is drawn and carries nothing, and the attenuverter on an unfilled CV input is skipped. Fill the jacks inside `audio()` — the engine installs attenuverter gains straight afterwards and can only wrap a jack that is already there.

**Testing a DSP.** `tests/dsp-harness.ts` gives you `loadProcessor(slug, over?)`: it stubs the worklet globals, loads your `.dsp.ts`, and returns an instance seeded from your def exactly as the rack seeds it, with `over` standing in for a moved control. Your module also joins `tests/dsp-smoke-sweep.test.ts` and `tests/module-contract-sweep.test.ts` by existing: the first runs it unpatched, silent and with signal and fails on NaN or out-of-range output, the second runs `checkDef` and checks that every declared input is read and every declared output written.

**Panel geometry is computed.** `src/modules/panel-layout.ts` owns the pixel constants and the layout. `layoutPanel(def)` lays out every panel from the definition alone; there is no `<id>.panel.ts` file, and `checkDef` reports a def too dense for its width as _"use at least N HP"_. A built-in may author its own normalised 0..1 `PanelLayout` as `ModuleDef.panel`, but only as a documented exception when it can show the computed layout fails (currently MIX 8 and TUBE); see `docs/adr/0001-panel-geometry-computed-by-default.md`. Node ids are `knob:`, `fader:`, `switch:`, `in:`, `out:`, `led:`, `label:` plus a single `display:<kind>`.

User modules made in the builder follow the same contract, and not by convention: `checkDef` is the same function the sweep runs over every built-in. They are stored in `localStorage` (definition and DSP source) and IndexedDB (faceplate image), and put back in the registry shortly after the page loads, so they appear in the module browser after a reload. A saved patch references its user modules by id and never carries them — open a patch naming one you do not have installed and it tells you which modules, and their cables, were skipped.

## Bring your own key

The builder talks to an LLM directly from the browser with a key you paste into Settings. One key per provider.

| provider  | chat / module generation | faceplate image generation |
| --------- | ------------------------ | -------------------------- |
| Anthropic | yes                      | no                         |
| OpenAI    | yes                      | yes                        |
| Gemini    | yes                      | yes                        |

Model ids are fetched from each provider at key-entry time, never hardcoded.

Keys go to `sessionStorage` by default, so closing the tab forgets them. Tick **Remember keys in this browser** in Settings to move them to `localStorage` instead; keys already there from an earlier version stay there and arrive with the box already ticked. Model ids are not secret and always live in `localStorage`. Gemini's key travels in the `x-goog-api-key` header, never in the URL — URLs end up in devtools and HAR exports.

Security note, stated plainly: a pure client-side app cannot hide a key from a script running on the same origin, so the app ships a CSP with no inline scripts and no third-party origins, and the key is never logged or placed in an error message. On GitHub Pages that origin is `https://<user>.github.io` and **every project site under the same account shares it** — any script on any of those sites can read Signaly's storage. A custom domain is the only thing that isolates it. Scope the key narrowly and rotate it in the provider dashboard.

## Running someone else's module

User DSP runs in an AudioWorklet, which by spec has no DOM and no network. That scope plus the CSP is the actual sandbox. The `FORBIDDEN` regex in `dsp-transpile.ts` is defence in depth and is deliberately not sound — `globalThis["eval"]`, aliasing `eval` to a variable, and dynamic `import()` all get past it; treating it as the boundary would be a mistake.

Since modules can be exported and imported, running a module file from a third party is a real thing you can do, so decide whether you trust the source. The damage ceiling is that a hostile or merely broken module wedges the audio thread and with it your own tab; reloading the page clears it. Nothing reaches the network, the page, or your API keys from inside worklet scope.
