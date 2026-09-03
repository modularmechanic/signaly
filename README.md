# Signaly

[![ci](https://github.com/modularmechanic/signaly/actions/workflows/ci.yml/badge.svg)](https://github.com/modularmechanic/signaly/actions/workflows/ci.yml)

Live at **https://modularmechanic.github.io/signaly/**

A lean, accessible, 2D modular synthesizer that runs entirely in the browser. 100 built-in Eurorack-style modules, patch cables, saved patches, and a module builder where you author new modules from a JSON definition plus a small TypeScript DSP class, optionally with help from your own LLM API key.

## Quickstart

Requires Node 24 or newer.

```bash
npm install && npm run dev
```

Open the printed URL, click anywhere to start audio, and patch `VCO` into `OUT`. Or open **Patches** and load one of the five example patches: five generative ambient pieces in five keys, from the user-built F minor arpeggio piece through slow FM and saw pads in D dorian, granular drones in A minor pentatonic, gliding chords through the valve in E-flat major, and a sub drone with a filtered pad in G minor.

## Scripts

| script              | what it does                                        |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | Vite dev server with HMR                            |
| `npm run build`     | typecheck + production bundle in `dist/`            |
| `npm run preview`   | serve the production bundle                         |
| `npm run typecheck` | `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) |
| `npm run lint`      | ESLint at `--max-warnings 0`                        |
| `npm run test`      | Vitest (engine, DSP, storage, UI kit)               |
| `npm run format`    | Prettier                                            |

## Author a module by hand

A module is a folder under `src/modules/<id>/` with two files. The registry picks them up by glob, so there is nothing to register.

`<id>.def.ts` — the data contract:

```ts
import type { ModuleDef } from '../../core/types';

export const def: ModuleDef = {
  id: 'myosc',
  name: 'MY OSC',
  sub: 'SAW',
  hp: 6,
  cat: 'SOURCES',
  worklet: 'myosc', // or `native: 'myosc'` for a Web Audio graph module
  knobs: [
    { id: 'freq', label: 'FREQ', min: 20, max: 8000, initial: 220, fmt: 'fHz', curve: 'log', cvIn: 'voct' },
  ],
  sws: [{ id: 'range', label: 'RANGE', options: ['LO', 'HI'], initial: 1 }],
  ins: [{ id: 'voct', label: 'V/OCT', kind: 'p' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: undefined, // 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text'
};
```

Declaring a `display` is only half of it: each kind reads specific `m.ext` keys or worklet messages, and nothing enforces the pairing. See the display contract table in `docs/system-architecture.md` before you set one.

Jack kinds: `a` audio, `p` pitch (1 V/oct), `g` gate/trigger, `c` control voltage. A knob with `attenuates: '<cvJackId>'` becomes a bipolar attenuverter on that CV input.

`<id>.dsp.ts` — one class, runs in the AudioWorklet thread:

```ts
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

class MyOsc extends Base {
  private ph = 0;
  defaults(): Params {
    return { freq: 220, range: 1 };
  } // knob and switch ids
  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const out = O[0]?.[0];
    if (!out) return true;
    const voct = ch(I, 0); // inputs ordered as def.ins
    const { freq = 220 } = this.p;
    for (let i = 0; i < out.length; i++) {
      // read .length, never assume 128
      const f = freq * Math.pow(2, voct?.[i] ?? 0);
      this.ph += f / sampleRate;
      if (this.ph >= 1) this.ph -= 1;
      out[i] = (this.ph * 2 - 1) * 5; // audio is ±5 V
    }
    return true;
  }
}
registerProcessor('myosc', MyOsc);
```

Signals are volts: audio ±5, gates 0 or 5, pitch 1 V/oct with 0 V = C4. Parameters arrive on `this.p` between blocks. Allocate nothing inside `process()`.

Symbols available in worklet scope, and nothing else: `Base`, `ch`, `clamp`, `TP`, `DENORMAL`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `lpCoeff`, `Lcg`, `ClockSync`, `SYNC_DIV`, `sampleRate`.

**Panel geometry is computed.** `layoutPanel(def)` lays out every panel from the definition alone — there is no `<id>.panel.ts` file. A built-in may author its own normalised 0..1 `PanelLayout` as `ModuleDef.panel`, but only as a documented exception when it can show the computed layout fails (currently only MIX 8); see `docs/adr/0001-panel-geometry-computed-by-default.md`. Node ids are `knob:`, `fader:`, `switch:`, `in:`, `out:`, `led:`, `label:` plus a single `display`.

User modules made in the builder follow the same contract; they are stored in `localStorage` (definition and DSP source) and IndexedDB (faceplate image), and appear in the module browser after a reload.

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
