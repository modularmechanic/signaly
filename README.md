# Signaly

A lean, accessible, 2D modular synthesizer that runs entirely in the browser. 41 built-in Eurorack-style modules, patch cables, saved patches, and a module builder where you author new modules from a JSON definition plus a small TypeScript DSP class, optionally with help from your own LLM API key.

## Quickstart

Requires Node 24 or newer.

```bash
npm install && npm run dev
```

Open the printed URL, click anywhere to start audio, and patch `VCO` into `OUT`.

## Scripts

| script | what it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | typecheck + production bundle in `dist/` |
| `npm run preview` | serve the production bundle |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint` | ESLint at `--max-warnings 0` |
| `npm run test` | Vitest (engine, DSP, storage, UI kit) |
| `npm run format` | Prettier |

## Author a module by hand

A module is a folder under `src/modules/<id>/` with two files: the definition, and one implementation — a worklet DSP class or a native Web Audio graph. The registry picks them up by glob, so there is nothing to register, and nothing anywhere counts the modules.

`<id>.def.ts` — the data contract:

```ts
import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'myosc', name: 'MY OSC', sub: 'SAW', hp: 6, cat: 'SOURCES',
  worklet: 'myosc',                       // or `native: 'myosc'` for a Web Audio graph module
  knobs: [{ id: 'freq', label: 'FREQ', min: 20, max: 8000, initial: 220, fmt: 'fHz', curve: 'log', cvIn: 'voct' }],
  sws: [{ id: 'range', label: 'RANGE', options: ['LO', 'HI'], initial: 1 }],
  ins: [{ id: 'voct', label: 'V/OCT', kind: 'p' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: undefined,                     // 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text'
  screen: undefined,                      // or `true` to reserve the screen box for your .parts.tsx
};
```

Declaring a `display` is only half of it: each kind reads specific `m.ext` keys or worklet messages. `src/modules/display-contract.ts` holds the contract as code — one row per kind, saying what the module must provide — and `checkDef` runs it over your def, so a screen you can never fill is a rejected module rather than a blank rectangle. If the feed goes missing at runtime the panel prints `NO <DISPLAY>` and the reason instead of drawing nothing. Declare `screen: true` instead of a `display` kind when your `.parts.tsx` fills the box.

Jack kinds: `a` audio, `p` pitch (1 V/oct), `g` gate/trigger, `c` control voltage.

Every knob needs an `fmt`: it is the knob's unit and, for the integer-stepped names, its quantisation while dragging — not a decoration. `FMT_RANGE` in `src/core/types.ts` bounds the range each name implies (`fPc` renders `v * 100`, `fMs` reads the value as seconds, `fKey`/`fChord`/`fShape`/`fRate` index a fixed label list), and `checkDef` rejects a knob that leaves those bounds.

**Attenuverters.** A CV input gets a bipolar amount knob by declaring `att(jackId, label)` (from `core/types`) in `knobs` — it is the whole declaration, the fixed ±1 range included, and the numbers live in one place:

```ts
knobs: [
  { id: 'cut', label: 'CUTOFF', min: 25, max: 14000, initial: 1200, fmt: 'fHz', cvIn: 'cv' },
  att('cv', 'FREQ CV'),                   // knob id defaults to '<jack>A'; pass a third arg to override
],
ins: [{ id: 'cv', label: 'FREQ CV', kind: 'c' }],
```

The engine puts a `GainNode` between the patch cable and the module input, so the knob is voltage scaling at the jack and **never** a DSP param — do not scale that input in DSP, and do not list the knob's id in the worklet. A jack takes at most one attenuverter; `cvIn` on the modulated knob is the display hint that pairs them.

`<id>.dsp.ts` — one class, runs in the AudioWorklet thread:

```ts
import { Base, ch } from '../../engine/dsp-prelude';

class MyOsc extends Base {
  private ph = 0;
  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0]; if (!out) return true;
    const voct = ch(I, 0);                                   // inputs ordered as def.ins
    const { freq = 220 } = this.p;
    for (let i = 0; i < out.length; i++) {                   // read .length, never assume 128
      const f = freq * Math.pow(2, voct?.[i] ?? 0);
      this.ph += f / sampleRate; if (this.ph >= 1) this.ph -= 1;
      out[i] = (this.ph * 2 - 1) * 5;                        // audio is ±5 V
    }
    return true;
  }
}
registerProcessor('myosc', MyOsc);
```

Signals are volts: audio ±5, gates 0 or 5, pitch 1 V/oct with 0 V = C4. Allocate nothing inside `process()`.

**Parameters come from the definition.** `seedParams(def)` in `src/engine/node-factory.ts` builds `this.p` from every knob and switch before the first block — in the rack and in the offline render that verifies a user module — and live changes arrive on `this.p` between blocks. So a `defaults()` method restating those initials is dead weight; the only reason to write one is internal state the definition does not describe. Read every param with a fallback anyway (`const { freq = 220 } = this.p`): a bare `this.p.freq` is how a DSP that misses a key renders NaN.

`<id>.native.ts` — instead of a worklet, a Web Audio graph built on the main thread:

```ts
export const native: NativeSpec = {
  audio(m) {                                       // called once, when the module is placed
    const g = getAudioContext().createGain();
    (m.natives ??= []).push(g);                    // teardown disconnects everything pushed here
    m.jacks.in.in = { node: g, idx: 0 };           // EVERY declared jack, by id, by hand
    for (const j of m.def.outs) m.jacks.out[j.id] = { node: g, idx: 0 };
  },
  param(m, id, v) {},                              // live knob AND switch changes, by id
  onConnectionChange(m, dir, jack, connected) {},  // optional
  dispose(m) {},                                   // optional; stop sources you started
};
```

`makeNode` throws when `audio()` leaves a declared jack unfilled, because every miss is otherwise silent: `wireCable` no-ops on an unfilled jack (cable drawn, no audio) and the attenuverter gain is skipped on an unfilled CV input (knob turns, nothing happens). Fill the jacks inside `audio()` — the engine installs attenuverter gains straight afterwards, and it can only wrap a jack that is already there. A switch reaches `param()` as its option index, under the switch's own id. Only built-ins can be native; user modules are always worklets.

Symbols available in worklet scope, and nothing else: `Base`, `ch`, `clamp`, `TP`, `DENORMAL`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `lpCoeff`, `Lcg`, `ClockSync`, `SYNC_DIV`, `sampleRate`.

**Panel geometry is computed.** `src/modules/panel-layout.ts` owns it all — the pixel constants (`HP_PX`, `PANEL_H`, the jack and fader widths, `MIN_CONTROL_PX`) and the layout itself. `layoutPanel(def)` lays out every panel from the definition alone; there is no `<id>.panel.ts` file. `fitPanel(def, maxHp)` is the verdict on whether a def lays out and, if not, the narrowest HP that would — `checkDef` reports it as *"use at least N HP"*. A built-in may author its own normalised 0..1 `PanelLayout` as `ModuleDef.panel`, but only as a documented exception when it can show the computed layout fails (currently only MIX 8); see `docs/adr/0001-panel-geometry-computed-by-default.md`. Node ids are `knob:`, `fader:`, `switch:`, `in:`, `out:`, `led:`, `label:` plus a single `display:<kind>`.

The whole rack scales from one number. `main.tsx` publishes `--u` (`--hp / 26`) and the panel widths on `:root` from those same constants, and the stylesheets draw every hardware dimension as a multiple of it — so `--hp` is the zoom. Type, hairlines and the ≥44px pointer targets deliberately stay fixed; see ADRs 0005 and 0006.

User modules made in the builder follow the same contract, and not by convention: `checkDef` is literally the same function the sweep runs over all 41 built-ins. They are stored in `localStorage` (definition and DSP source) and IndexedDB (faceplate image), and are put back in the registry at boot, so they are in the module browser from the first frame. A saved Patch references its user modules by id and never carries them — open a Patch naming one you do not have installed and it tells you which modules were skipped.

## Bring your own key

The builder talks to an LLM directly from the browser with a key you paste into Settings. One key per provider.

| provider | chat / module generation | faceplate image generation |
|---|---|---|
| Anthropic | yes | no |
| OpenAI | yes | yes |
| Gemini | yes | yes |

Model ids are fetched from each provider at key-entry time, never hardcoded.

Security note, stated plainly: keys live in `localStorage`. A pure client-side app cannot hide a key from a script running on the same origin, so the app ships a CSP with no inline scripts and no third-party origins, and the key is never logged or placed in an error message. Scope the key narrowly and rotate it in the provider dashboard.

## Running someone else's module

User DSP runs in an AudioWorklet, which by spec has no DOM and no network. That scope plus the CSP is the actual sandbox. The `FORBIDDEN` regex in `dsp-transpile.ts` is defence in depth and is deliberately not sound — `globalThis["eval"]`, aliasing `eval` to a variable, and dynamic `import()` all get past it; treating it as the boundary would be a mistake.

Since modules can be exported and imported, running a module file from a third party is a real thing you can do, so decide whether you trust the source. The damage ceiling is that a hostile or merely broken module wedges the audio thread and with it your own tab; reloading the page clears it. Nothing reaches the network, the page, or your API keys from inside worklet scope.

## Deliberately absent

No backend, no accounts, no public module sharing, no multiplayer, no 3D, no MIDI learn, no streaming LLM output, no end-to-end tests. Storage is one thin module per concern so a backend can replace it later without touching the engine or UI.
