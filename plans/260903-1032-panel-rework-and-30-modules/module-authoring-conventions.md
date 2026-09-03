# Module authoring conventions

Shared by phases 04–07. Read this plus your batch's phase file before writing anything.

## Files

A module is a directory `src/modules/<id>/` picked up by glob. Nothing to register anywhere.

| file             | required | what                                                             |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `<id>.def.ts`    | yes      | `export const def: ModuleDef` — panel contents, no geometry       |
| `<id>.dsp.ts`    | yes      | a `Base` subclass ending in `registerProcessor('<id>', Klass)`    |
| `<id>.dsp.test.ts` | yes    | one test that fails if the DSP is wrong                           |
| `<id>.parts.tsx` | rarely   | only for a module needing custom React (see SEQ, MIX 8)           |

Do **not** author a `panel` on the def. `layoutPanel` computes geometry for every built-in; MIX 8 is
the single documented exception and stays that way.

## The signal contract

From `CONTEXT.md`, and the contract sweep enforces parts of it:

- Audio is **±5 V**. Clamp any output that could exceed it.
- CV is ±5 V; a gate is 0 V or 5 V; a trigger is a single-block 5 V pulse.
- Pitch is 1 V/oct and its jack `kind` is `'p'`. Plain CV is `'c'`, audio is `'a'`, gate/trigger is `'g'`.
  Getting `kind` wrong is a real defect (CodeRabbit #13 was exactly this).

## Jack and knob shape

```ts
knobs: [
  { id: 'cut', label: 'CUTOFF', min: 30, max: 16000, initial: 800, fmt: 'fHz', curve: 'log', big: true, cvIn: 'cv' },
  { id: 'cv',  label: 'CV AMT', min: -1, max: 1, initial: 0, fmt: 'f1', attenuates: 'cv' },
]
```

- `big: true` marks the one headline control. At most one per module.
- `cvIn` links a knob to the jack that modulates it; `attenuates` marks a knob as that jack's attenuverter.
  A jack may have **at most one** attenuverter — duplicates are rejected by validation.
- `fmt` picks the readout. The **complete** set is the `FmtName` union in `src/core/types.ts`:
  `fHz`, `fMs`, `fPc`, `f1`, `fSemi`, `fInt`, `fKey`, `fChord`, `fShape`, `fRate`. There is no `f2`,
  no `fDb` and no `fSteps` — use `fInt` for step counts and `fSemi` for semitones. Do not invent a
  format name; adding one means editing `src/core/types.ts` and `src/hooks/formatters.ts`, which are
  shared files you do not own, so report the need instead.
  The discrete ones must also be in `isIntFmt` in `src/hooks/formatters.ts` or arrow keys step wrongly.
- `curve: 'log'` for anything measured in Hz or time.

## DSP

Extend `Base`. Available from `../../engine/dsp-prelude`: `TP`, `clamp`, `flush`, `ch`, `blep`, `oscW`,
`DL` (delay line), `OnePole`, `onePoleCoeff`, `lpCoeff`, `ClockSync`, `SYNC_DIV`, `Lcg`.

- Reuse the prelude. Do not write a second one-pole, a second delay line or a second RNG — that is
  exactly the duplication that produced two divergent `Lcg` copies.
- `defaults()` must return every param the processor reads, matching each knob's `initial`.
- Guard every output: `const out = O[0]?.[0]; if (!out) return true;`
- `flush()` any recursive state that can go subnormal.
- Read inputs with `ch(I, n)` and treat a null channel as 0.

## Tests

Follow `src/modules/svf/svf.dsp.test.ts`: stub `sampleRate`, `AudioWorkletProcessor` and
`registerProcessor`, import the module, pull the class out of the registration call.

The test must assert the module's **defining behaviour**, not that it runs. A filter attenuates above
cutoff; a quantizer lands on scale degrees; a wavefolder adds harmonics; a comparator opens only inside
its window. Verify the test fails against wrong code before you move on.

Keep assertions out of long loops. Collect extremes and assert once — 400 000 `expect()` calls timed
the suite out on CI once already.

## Limits

- Files stay under 200 lines. `reverb.dsp.ts` is the standing exception; do not add another.
- Panel density: your batch's HP is set in the plan table and phase 01's fit check enforces it. If the
  controls genuinely do not fit, change the control set or raise the HP in the def and say so — do not
  let the panel overflow.
- Every module needs `name`, `sub`, `hp`, `cat`, `worklet` and a distinct `id`. `cat` must be one of the
  values in `CAT_COLOR`.
- `tests/module-catalog.test.ts` asserts the exact id set. It has to be updated when modules land;
  phase 08 owns that file, so leave it alone and report your ids.

## Added 2026-09-03 for the catalogue-to-100 expansion

- **`look` is required.** Every def names one of the twenty kits in `src/core/look.ts`:
  `analog atelier console noir board anodic bronze slateware carbon chalk lab tape stage voice
  signal ether grid patina arc press`. Pick one that suits the module and spread them across a
  batch. The category default exists only for user-authored modules.
- **The fit test is a gate**: `npx vitest run src/modules/panel-fit.test.ts` after every def. Raise
  `hp` or drop a control rather than let a panel overflow. Knob rows need 37 px or their label
  is deleted; a 0.075 row on the 658 px panel is 49 px.
- **Custom UI lives in `<id>.parts.tsx`** and takes the `display` slot: declare `display: 'text'`
  on the def and export `parts`; the parts component replaces the display node. See
  `src/modules/seq/seq.parts.tsx`. Read knobs with `useParam`, worklet messages with
  `useWorkletFeed`, and send with `usePortSend`. Never `setState` per frame; drive visuals
  through CSS custom properties.
- **Per-module state that must survive save and load** goes on `m.ext` through a `serialize`
  spec (`save`, `load`, `validate` — validate runs on untrusted JSON and must never throw). See
  `src/modules/seq/seq.serialize.ts`.
- **Custom worklet messages**: override `msg(m: InMsg)` in the DSP class. `{ t: 'p' }` is
  reserved for params. Transfer large buffers as transferables and post a fresh copy each time.
- **One-option switches** render as a lit push-button toggle (0/1) — use them for M/S-style
  buttons, not for on/off pairs.
- Builders run on a shared tree with other agents: touch only your own module directories and
  the files your batch is told it owns; run `git status --short` before editing anything shared.
