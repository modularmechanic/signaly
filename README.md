# Signaly

A lean, accessible, 2D modular synthesizer that runs entirely in the browser. 40 built-in Eurorack-style modules, patch cables, presets, and a module builder where you author new modules from a JSON definition plus a small TypeScript DSP class, optionally with help from your own LLM API key.

![screenshot placeholder](docs/screenshot.png)

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

A module is a folder under `src/modules/<id>/` with three files. The registry picks them up by glob, so there is nothing to register.

`<id>.def.ts` — the data contract:

```ts
import type { ModuleDef } from '../../core/types';
import { panel } from './myosc.panel';

export const def: ModuleDef = {
  id: 'myosc', name: 'MY OSC', sub: 'SAW', hp: 6, cat: 'SOURCES',
  worklet: 'myosc',                       // or `native: 'myosc'` for a Web Audio graph module
  knobs: [{ id: 'freq', label: 'FREQ', min: 20, max: 8000, def: 220, fmt: 'fHz', curve: 'log', cvIn: 'voct' }],
  sws: [{ id: 'range', label: 'RANGE', options: ['LO', 'HI'], def: 1 }],
  ins: [{ id: 'voct', label: 'V/OCT', kind: 'p' }],
  outs: [{ id: 'out', label: 'OUT', kind: 'a' }],
  display: undefined,                     // 'scope' | 'meter' | 'steps' | 'env' | 'piano' | 'text'
  panel,
};
```

Jack kinds: `a` audio, `p` pitch (1 V/oct), `g` gate/trigger, `c` control voltage. A knob with `attenuates: '<cvJackId>'` becomes a bipolar attenuverter on that CV input.

`<id>.dsp.ts` — one class, runs in the AudioWorklet thread:

```ts
import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

class MyOsc extends Base {
  private ph = 0;
  defaults(): Params { return { freq: 220, range: 1 }; }   // knob and switch ids
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

Signals are volts: audio ±5, gates 0 or 5, pitch 1 V/oct with 0 V = C4. Parameters arrive on `this.p` between blocks. Allocate nothing inside `process()`.

Symbols available in worklet scope, and nothing else: `Base`, `ch`, `clamp`, `TP`, `flush`, `blep`, `oscW`, `DL`, `OnePole`, `onePoleCoeff`, `ClockSync`, `SYNC_DIV`, `sampleRate`.

`<id>.panel.ts` — normalised 0..1 geometry:

```ts
import type { PanelLayout } from '../../core/types';
export const panel: PanelLayout = { nodes: [
  { id: 'knob:freq',    kind: 'knob',   x: 0.15, y: 0.15, w: 0.70, h: 0.18, label: 'FREQ' },
  { id: 'switch:range', kind: 'switch', x: 0.15, y: 0.40, w: 0.70, h: 0.08, label: 'RANGE' },
  { id: 'in:voct',      kind: 'in',     x: 0.10, y: 0.80, w: 0.35, h: 0.10, label: 'V/OCT' },
  { id: 'out:out',      kind: 'out',    x: 0.55, y: 0.80, w: 0.35, h: 0.10, label: 'OUT' },
] };
```

Node ids are `knob:`, `fader:`, `switch:`, `in:`, `out:`, `led:`, `label:` plus a single `display`. Omit `panel` and a grid layout is computed from the definition.

User modules made in the builder follow the same contract; they are stored in `localStorage` (definition and DSP source) and IndexedDB (faceplate image), and appear in the module browser after a reload.

## Bring your own key

The builder talks to an LLM directly from the browser with a key you paste into Settings. One key per provider.

| provider | chat / module generation | faceplate image generation |
|---|---|---|
| Anthropic | yes | no |
| OpenAI | yes | yes |
| Gemini | yes | yes |

Model ids are fetched from each provider at key-entry time, never hardcoded.

Security note, stated plainly: keys live in `localStorage`. A pure client-side app cannot hide a key from a script running on the same origin, so the app ships a CSP with no inline scripts and no third-party origins, and the key is never logged or placed in an error message. Scope the key narrowly and rotate it in the provider dashboard.

## Deliberately absent

No backend, no accounts, no public module sharing, no multiplayer, no 3D, no MIDI learn, no streaming LLM output, no end-to-end tests. Storage is one thin module per concern so a backend can replace it later without touching the engine or UI.
