---
title: 'Signaly: the catalogue goes to 100'
description: 'Twenty-nine new modules: sequencing, effects, a sampler with granular synthesis, a family of distortions led by a glowing 12AX7, and a family of filters'
status: in-progress
priority: P1
branch: feat/mixer-sends-and-cv-feedback
tags: [modules, sampler, granular, distortion, filters, sequencing]
created: 2026-09-03
---

# The catalogue goes to 100

71 today. The user's brief: more sequencing, more effects, a sampler and sample loader, granular
synthesis and granular delays, a range of distortions and overdrives led by a TUBE module whose
12AX7 lights up as it is driven and whose tube type changes the sound, and a variety of
different-sounding filters. Twenty-nine modules, five batches, built in parallel.

Every builder reads `../260903-1032-panel-rework-and-30-modules/module-authoring-conventions.md`
first. Two rules are new since the last expansion and are repeated here because they are easy
to miss:

- **Every def carries an explicit `look`**, one of the twenty kits in `src/core/look.ts`. Spread
  them: a batch of six modules uses at least four kits, and the kit should suit the module (no
  cream lab kit on a fuzz; `stage`, `carbon`, `noir` for the dirt; `atelier`, `chalk`, `arc` for
  the delicate). The category default is only for user-authored modules.
- **The fit test is a hard gate**: `npx vitest run src/modules/panel-fit.test.ts` after every def.

## Batch A — sequencing (8) `src/modules/{seq16,trigseq,chords,bern,divmult,cvrec,shift,rndwalk}/`

| id       | name        | sub                       | HP | purpose                                                        |
| -------- | ----------- | ------------------------- | -- | -------------------------------------------------------------- |
| seq16    | SEQ-16      | 16-STEP CV / GATE         | 16 | The long sequencer: 16 steps, per-step pitch, gate and slide   |
| trigseq  | TRIG SEQ    | 4 × 16 TRIGGER GRID       | 16 | Four trigger lanes for drums, per-lane length for polymeter    |
| chords   | CHORD       | ROOT → FOUR VOICES        | 6  | One pitch in, four chord voices out, type and inversion knobs  |
| bern     | BERNOULLI   | WEIGHTED COIN GATE        | 4  | A gate goes to A or B by a biased coin, bias under CV          |
| divmult  | DIV / MULT  | SIX CLOCK RATIOS          | 6  | ÷8 ÷4 ÷2 ×2 ×3 ×4 from one clock, with reset                  |
| cvrec    | CV REC      | RECORD AND LOOP A CV      | 8  | Record a CV or knob movement for up to 16 bars and loop it     |
| shift    | SHIFT REG   | 4-STAGE ANALOG SHIFT      | 6  | Sample a CV on each clock and pass it down four outputs: canons |
| rndwalk  | RANDOM WALK | BROWNIAN CV               | 4  | A value that drifts by a random step each clock, within bounds |

SEQ-16 and TRIG SEQ need a `parts.tsx` for the step grid; copy the mechanism from
`src/modules/seq/` (`seq.parts.tsx`, `seq.serialize.ts`, `pushSeq`, the `steps` message the DSP
handles in `msg()`), do not copy its 8-step limit. TRIG SEQ's grid is 4 rows × 16 buttons with a
per-row LENGTH knob (1–16) so lanes can run in polymeter. CV REC stores its recording in `m.ext`
through a `serialize` spec so it survives save and load; cap it at 16 bars of 24 ppq. Tests:
SEQ-16 advances 16 steps then wraps and RESET returns to step 1; TRIG SEQ lanes of length 3 and
4 realign every 12 clocks; CHORD's four outs are the chord's semitone offsets above the root in
1 V/oct; BERNOULLI at bias 0 never fires B and at bias 1 never fires A; DIV/MULT's ×2 out fires
twice per clock at a steady input; CV REC plays back what it recorded; SHIFT REG's out 4 is out 1
delayed by three clocks; RANDOM WALK stays inside its bounds over 10 000 clocks.

## Batch B — effects (7) `src/modules/{gdelay,shimmer,trem,envfilt,lofi,rvsdelay,freqshift}/`

| id        | name        | sub                        | HP | purpose                                                         |
| --------- | ----------- | -------------------------- | -- | --------------------------------------------------------------- |
| gdelay    | GRAIN DELAY | GRANULAR DELAY LINE        | 10 | Grains read from a feedback delay: size, density, pitch, spray  |
| shimmer   | SHIMMER     | OCTAVE-UP FEEDBACK VERB    | 8  | A reverb whose feedback path is pitch-shifted up an octave      |
| trem      | TREMOLO     | AMPLITUDE / AUTO-PAN       | 4  | Sine, triangle and square shapes, rate under clock sync         |
| envfilt   | ENV FILTER  | AUTO-WAH                   | 6  | An envelope follower sweeps a resonant filter, up or down       |
| lofi      | LO-FI       | HISS · WOW · CRACKLE       | 6  | Tape hiss, wow, bandwidth and vinyl crackle, each on a knob     |
| rvsdelay  | REVERSE     | REVERSE DELAY              | 6  | Chunks of the input played backwards, chunk length under sync   |
| freqshift | FREQ SHIFT  | BODE FREQUENCY SHIFTER     | 6  | Hilbert-pair single-sideband shift: up and down outs            |

Every effect has a dry-wet control and every test first asserts fully dry passes the input
through unchanged. GRAIN DELAY reuses `DL` and `Lcg`; SHIMMER reuses the pitch-shift overlap-add
idea from `src/modules/pitch/` inside a feedback loop with a damping `OnePole`; REVERSE fills a
buffer of the chunk length and plays it back reversed with a crossfade at the seam, or it will
click; FREQ SHIFT needs a Hilbert transform: a pair of allpass chains 90° apart is the standard
implementation and the test is that shifting by +100 Hz moves a 1 kHz tone to 1.1 kHz with the
1 kHz gone.

## Batch C — distortion (5) `src/modules/{tube,fuzz,rectify,saturate,overdrive}/`

| id        | name       | sub                       | HP | purpose                                                              |
| --------- | ---------- | ------------------------- | -- | -------------------------------------------------------------------- |
| tube      | TUBE       | 12AX7 · 12AU7 · EL34 · KT88 | 8 | Valve stage with a glowing tube and selectable tube types            |
| fuzz      | FUZZ       | GERMANIUM / SILICON       | 4  | Two-transistor fuzz with gate and starve, distinct from DIST         |
| rectify   | RECTIFY    | HALF / FULL WAVE          | 4  | Half- or full-wave rectification with DC block, octave-up on audio   |
| saturate  | SATURATE   | TAPE / CONSOLE            | 4  | Gentle programme saturation with bias and tilt                       |
| overdrive | OVERDRIVE  | OP-AMP CLIPPER + TONE     | 6  | The classic pedal: soft clip, tone stack, level                      |

**TUBE is the flagship of the batch and the one the user described in detail.** The panel carries
an inline SVG of a 12AX7 — glass envelope, plates, the getter flash at the top, the heater
filament — drawn in `tube.parts.tsx` and rendered in a `display` slot (see how `seq.parts.tsx`
takes the display slot). The filament and plate glow scale with the DRIVE knob: read it with
`useParam` and drive the SVG through CSS custom properties (`--heat` 0..1), so the glow is a
style change, not a re-render per frame. A TYPE switch (12AX7 / 12AU7 / 6L6 / EL34 / KT88)
changes the DSP transfer curve: 12AX7 high gain and asymmetric, 12AU7 low gain and clean, 6L6
and EL34 power-tube style with more even harmonics and sag, KT88 the cleanest with the most
headroom. Knobs: DRIVE (big, `cvIn`), BIAS (asymmetry), SAG (supply droop under level), TONE
(log), LEVEL, DRIVE CV attenuverter. Ins: IN, DRIVE CV. Outs: OUT. Test: harmonic content rises
with DRIVE and the five types produce five measurably different second-to-third harmonic ratios.
Keep the SVG tasteful and small (one file under 200 lines); no raster, no filters that repaint per
frame — a CSS `opacity` and `color-mix` glow is enough.

## Batch D — filters (6) `src/modules/{ms20,steiner,fixedbank,dualbp,polivoks,djfilt}/`

| id        | name        | sub                        | HP | purpose                                                       |
| --------- | ----------- | -------------------------- | -- | ------------------------------------------------------------- |
| ms20      | MS-20       | KORG35 LOW / HIGH PASS     | 4  | The screaming Sallen-Key with its clipping resonance path     |
| steiner   | STEINER     | STEINER-PARKER MULTIMODE   | 4  | Input-side mode selection: LP / BP / HP / AP, very different  |
| fixedbank | FIXED BANK  | EIGHT-BAND FILTER BANK     | 12 | Eight fixed bandpass bands on faders, the classic bank        |
| dualbp    | DUAL BP     | TWO BANDPASS · SPREAD      | 6  | Two peaks with spread and mix, vocal and formant-like         |
| polivoks  | POLIVOKS    | SOVIET OP-AMP FILTER       | 4  | Op-amp integrators driven into clipping: harsh and unstable   |
| djfilt    | DJ FILTER   | ONE-KNOB LP ↔ HP           | 4  | Centre is flat, left sweeps a low pass in, right a high pass  |

Each filter's test proves its defining character, not just attenuation: MS-20 that resonance
self-oscillates and clips at ±5 V; STEINER that the four modes produce four different responses
at the same cutoff; FIXED BANK that band 3 alone passes its centre and rejects a tone two bands
away; DUAL BP that spread separates two measurable peaks; POLIVOKS that drive adds harmonics the
input lacks; DJ FILTER that centre is transparent and the two sides attenuate opposite ends.

## Batch E — sampler and granular synthesis (3) `src/modules/{sampler,slicer,cloud}/` + shared infrastructure

| id      | name    | sub                           | HP | purpose                                                            |
| ------- | ------- | ----------------------------- | -- | ------------------------------------------------------------------ |
| sampler | SAMPLER | LOAD · TRIGGER · LOOP         | 12 | Load a WAV/MP3, play it on a trigger at 1 V/oct with start, end, loop, reverse |
| slicer  | SLICER  | CHOP A SAMPLE INTO N SLICES   | 10 | Divide the loaded sample into N equal slices and pick one by CV or step |
| cloud   | CLOUD   | GRANULAR SYNTHESIS            | 12 | Granular texture synthesis over a loaded sample: position, size, density, pitch, freeze |

This batch owns the shared sample infrastructure, which nothing else in the app has today:

- `src/storage/sample-store.ts` — Blobs in IndexedDB through `idb-keyval`, exactly the pattern of
  `src/storage/image-store.ts` (`newSampleId`, `saveSample`, `getSample`, `removeSample`); plus
  `decodeSample(blob): Promise<Float32Array>` that decodes through `getAudioContext()` from
  `src/engine/audio-context.ts` and mixes to mono. Reject files over 20 MB and longer than 60 s
  with a user-facing message; never throw into React.
- `src/ui/molecules/sample-picker.tsx` — a file `<input accept="audio/*">` behind a styled button,
  the file name, its duration, and a small waveform drawn once on a canvas (not per frame). Used
  by all three modules' `parts.tsx`.
- Each module's `serialize` spec saves the sample id (not the audio) in `m.ext`, so a saved patch
  reloads its sample from IndexedDB; a missing sample shows "no sample" rather than crashing.
- The decoded `Float32Array` reaches the worklet by `port.postMessage({ t: 'sample', v }, [v.buffer])`
  as a transferable, handled in the DSP's `msg()`. Post a fresh copy each time; a transferred buffer
  is detached.

Tests: the store round-trips a blob; SAMPLER plays the buffer at the right rate for +12 semitones
(twice as fast, using a synthetic ramp as the sample so the test needs no decoder); SLICER with
N = 4 and slice 2 plays the second quarter; CLOUD with density up produces overlapping grains and
with freeze on stops advancing position. jsdom has no `decodeAudioData`; test the decode path's
guards (size and length limits) and hand the DSP a synthetic buffer directly.

## Integration (after the batches)

`tests/module-catalog.test.ts` to 100 ids; module counts in README, architecture doc and roadmap;
changelog entries; a `look` audit that every new def has one and the twenty kits stay spread; the
panel visual sweep on the 29 new panels; the full gate; then a review workflow over the batch.
