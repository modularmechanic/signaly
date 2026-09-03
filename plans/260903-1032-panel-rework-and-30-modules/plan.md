---
title: 'Signaly: panel rework and 30 new modules'
description: 'Fix the panel geometry engine and rebalance every existing panel, then grow the catalogue from 41 to 71 modules with a coherent Eurorack identity'
status: planned
priority: P1
branch: fix/panel-layout-audit
tags: [ui, panel-layout, modules, eurorack]
created: 2026-09-03
---

# Panel rework and 30 new modules

Two problems, one root. The user reports that 4 HP panels clip the remove button, that some panels are
far too narrow for their controls, and that others are far wider than their content needs. The
catalogue also reads as a web form on most panels rather than a Eurorack system.

The root is that `hp` is authored per module and `computePanel` lays out whatever it is given. Nothing
checks that the controls actually fit. The density table below is the evidence.

## Evidence: control density against panel width

`HP_PX = 26`, so width in px is `hp × 26`. Elements counted as knobs + switches + jacks.

| module | HP | px  | knobs | sws | jacks | elements | px per element |
| ------ | -- | --- | ----- | --- | ----- | -------- | -------------- |
| drum2  | 2  | 52  | 7     | 4   | 5     | 16       | 3.3            |
| crush  | 2  | 52  | 6     | 0   | 5     | 11       | 4.7            |
| monov  | 6  | 156 | 9     | 5   | 6     | 20       | 7.8            |
| reverb | 10 | 260 | 14    | 6   | 7     | 27       | 9.6            |
| dist   | 4  | 104 | 6     | 5   | 5     | 16       | 6.5            |
| seq    | 17 | 442 | 2     | 0   | 4     | 6        | 73.7           |
| quad   | 10 | 260 | 2     | 3   | 7     | 12       | 21.7           |

Anything under about 10 px per element is unreadable; anything over about 30 is wasted panel.

## Phases

| #   | phase                                        | status  | group | link                                                   |
| --- | -------------------------------------------- | ------- | ----- | ------------------------------------------------------ |
| 01  | Panel geometry defects and the clipped button | planned | 1     | [phase-01](phase-01-panel-geometry-defects.md)         |
| 02  | Rebalance HP across the existing 41 modules   | planned | 2     | [phase-02](phase-02-rebalance-existing-panels.md)      |
| 03  | Eurorack identity pass                        | planned | 2     | [phase-03](phase-03-eurorack-identity.md)              |
| 04  | New modules batch A — sources and filters     | planned | 3     | [phase-04](phase-04-modules-sources-filters.md)        |
| 05  | New modules batch B — function, amp and mix   | planned | 3     | [phase-05](phase-05-modules-function-amp-mix.md)       |
| 06  | New modules batch C — effects                 | planned | 3     | [phase-06](phase-06-modules-effects.md)                |
| 07  | New modules batch D — voices, sequencing, drums | planned | 3   | [phase-07](phase-07-modules-voices-seq-drums.md)       |
| 08  | Catalogue integration, docs and release       | planned | 4     | [phase-08](phase-08-integration-and-release.md)        |

Group 1 solo: the geometry engine has to be right before anything is laid out against it. Group 2 runs
02 and 03 together. Group 3 runs the four module batches in parallel, each owning its own module
directories. Group 4 solo.

## The 30 new modules

Chosen to fill the gaps a Eurorack user would notice in the current 41: no low pass gate, no
quantizer, no Turing machine, no wavefolder, no ring modulator, no matrix mixer, no sequential switch,
no logic, no granular, no physical modelling. None is ported from the earlier project.

### Sources (5)

| id        | name      | sub                    | HP  | purpose                                            |
| --------- | --------- | ---------------------- | --- | -------------------------------------------------- |
| wavetable | WAVETABLE | MORPHING WAVE SCANNER  | 8   | Scan a wavetable with CV over the morph position    |
| fmop      | FM OP     | 2-OPERATOR PAIR        | 6   | Carrier plus modulator with ratio and index         |
| super     | SUPER     | 7-VOICE UNISON SAW     | 6   | Detuned unison stack with width control             |
| chaos     | CHAOS     | LORENZ / LOGISTIC CV   | 4   | Chaotic CV source, rate and strangeness             |
| grain     | GRAIN     | GRANULAR TEXTURE       | 10  | Granular cloud from a live-captured buffer          |

### Filters (4)

| id    | name  | sub                    | HP  | purpose                                      |
| ----- | ----- | ---------------------- | --- | -------------------------------------------- |
| diode | DIODE | DIODE LADDER           | 4   | Aggressive diode ladder, distinct from LADDER |
| lpg   | LPG   | VACTROL LOW PASS GATE  | 4   | The Buchla-style gate the catalogue lacks     |
| morph | MORPH | CONTINUOUS LP-BP-HP    | 4   | One knob sweeps the response, CV over it      |
| reson | RESON | 3-PEAK RESONATOR       | 6   | Tuned resonant bank for struck and bowed tones |

### Function and control (4)

| id      | name    | sub                   | HP  | purpose                                     |
| ------- | ------- | --------------------- | --- | ------------------------------------------- |
| ad      | AD      | LOOPING AD ENVELOPE   | 4   | Snappy attack-decay with a loop switch      |
| slew    | SLEW    | DUAL SLEW / GLIDE     | 4   | Independent rise and fall portamento        |
| logic   | LOGIC   | AND / OR / XOR / NOT  | 4   | Boolean combination of gates                |
| compare | COMPARE | WINDOW COMPARATOR     | 4   | Gate when a CV sits inside a window         |

### Amp and mix (3)

| id     | name   | sub                   | HP  | purpose                                  |
| ------ | ------ | --------------------- | --- | ---------------------------------------- |
| xfade  | XFADE  | CROSSFADE / PAN       | 4   | Voltage-controlled crossfade and pan     |
| ring   | RING   | 4-QUADRANT MULTIPLY   | 4   | True ring modulation, not just a VCA     |
| matrix | MATRIX | 4 x 4 MATRIX MIXER    | 12  | Four ins to four buses with level per cell |

### Effects (6)

| id       | name     | sub                   | HP  | purpose                                       |
| -------- | -------- | --------------------- | --- | --------------------------------------------- |
| phaser   | PHASER   | 6-STAGE ALL-PASS      | 6   | Classic sweep the catalogue lacks             |
| wavefold | WAVEFOLD | BUCHLA-STYLE FOLDER   | 4   | Timbre from folding, distinct from DIST       |
| freeze   | FREEZE   | CAPTURE AND SUSTAIN   | 8   | Freeze a moment and hold it indefinitely      |
| pitch    | PITCH    | SHIFTER / HARMONIZER  | 8   | Pitch shift with a dry-wet blend              |
| glitch   | GLITCH   | BUFFER REPEAT         | 6   | Stutter and repeat driven by a clock          |
| spread   | SPREAD   | STEREO IMAGER         | 4   | Width and mono-compatibility control          |

### Voices (2)

| id      | name    | sub                  | HP  | purpose                                    |
| ------- | ------- | -------------------- | --- | ------------------------------------------ |
| fmvoice | FM VOICE | 4-OPERATOR FM       | 12  | Complete FM voice with algorithm selection |
| pluck   | PLUCK   | KARPLUS-STRONG       | 6   | Physically modelled plucked string         |

### Sequencing and control (4)

| id      | name     | sub                    | HP  | purpose                                  |
| ------- | -------- | ---------------------- | --- | ---------------------------------------- |
| quant   | QUANT    | SCALE QUANTIZER        | 6   | Snap CV to a musical scale               |
| turing  | TURING   | LOOPING SHIFT REGISTER | 8   | The random-but-repeating sequence source |
| burst   | BURST    | RATCHET / BURST GEN    | 4   | Fire n triggers per gate                 |
| sswitch | SWITCH   | SEQUENTIAL 1-4 / 4-1   | 4   | Route one signal among four, clocked     |

### Drums (2)

| id   | name | sub                | HP  | purpose                          |
| ---- | ---- | ------------------ | --- | -------------------------------- |
| kick | KICK | ANALOG BASS DRUM   | 6   | Dedicated kick, not a generic hit |
| hats | HATS | METALLIC HI-HAT    | 6   | Closed and open hat from one core |

Catalogue after this plan: **71 modules**.

## Key decisions

- **The geometry engine is fixed before any new panel is authored.** Building 30 panels against a
  layout that clips controls would bake the defect in 30 more times.
- **HP is derived, not guessed.** Phase 01 adds a fit check so a module whose controls cannot fit is a
  test failure, not a visual surprise. Phase 02 then rebalances the existing 41 against it.
- **No ports from the earlier project.** Every module here is specified from its function, and the
  license question (H2) is about ported DSP, so new work must not add to it.
- **Each module still leaves one test behind**, per the repo's testing conventions.

## Unresolved questions

- Does the fit check become a hard test failure for user-authored modules too, or only for built-ins?
  A user module that fails would need a clear error rather than a crash.
- MIX 8 authors its own `panel`. Does the rebalance touch it, or is authored geometry exempt?
