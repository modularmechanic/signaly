# Phase 06 — New modules batch C: effects

Owns `src/modules/{phaser,wavefold,freeze,pitch,glitch,spread}/` and nothing else.
Read `../module-authoring-conventions.md` first. Six modules.

Every effect in this batch needs a dry-wet control, and every one of them must pass the dry signal
through unchanged at fully dry. That is the first thing each test should assert.

**PHASER** `phaser`, 6 HP, FX. Six all-pass stages swept by an internal LFO or by CV, the classic the
catalogue lacks. FLANGER is a delay-based comb; this is an all-pass phase sweep and must sound
different. Knobs: RATE (big, log), DEPTH, CENTRE (log, `cvIn`), FEEDBACK, CENTRE CV attenuverter,
MIX. Switch: STAGES — 4 / 6 / 8. Ins: IN, CENTRE CV, SYNC. Outs: OUT. Test: notches appear at the
expected frequencies and move with CENTRE; feedback deepens them.

**WAVEFOLD** `wavefold`, 4 HP, FX. A Buchla-style folder: gain into a folding function so extra
harmonics appear as level rises, unlike DIST which clips or saturates. Knobs: FOLD (big, `cvIn`),
SYMMETRY (offset before folding), FOLD CV attenuverter, LEVEL. Ins: IN, FOLD CV. Outs: OUT. Test: a
sine at increasing FOLD gains harmonics while its peak amplitude stays bounded — that boundedness is
what separates folding from clipping.

**FREEZE** `freeze`, 8 HP, FX. Capture a moment of audio and sustain it indefinitely. Knobs: SIZE
(big, log, ms — the captured window), PITCH, SMOOTH (crossfade at the loop seam), MIX. Switch: MODE —
GATE (frozen while held) / TOGGLE (a trigger latches). Ins: IN, FREEZE (`'g'`), PITCH CV. Outs: L, R.
LED: frozen. Use `DL` for the capture buffer and crossfade the seam or it will click. Test: after
freezing, the output repeats with period SIZE and is independent of further input.

**PITCH** `pitch`, 8 HP, FX. A pitch shifter and harmonizer. Two shifted voices plus dry so it earns
its width. Knobs: SHIFT 1 (big, semitones, `fmt: 'fSemi'`, `cvIn`), SHIFT 2, SHIFT CV attenuverter,
WINDOW (log, ms), FEEDBACK, MIX. Ins: IN, SHIFT CV. Outs: OUT. Overlap-add two delay taps with a
crossfade; a single tap will click on wrap. Test: a shift of +12 semitones doubles the detected
fundamental, and a shift of 0 passes the input through.

**GLITCH** `glitch`, 6 HP, FX. Clocked buffer repeat and stutter. Knobs: LENGTH (big, log, ms),
REPEATS, PROBABILITY (chance a given clock fires a repeat), PITCH (playback rate of the repeat), MIX.
Switch: SYNC — FREE / CLOCK. Ins: IN, CLOCK (`'g'`), TRIG (`'g'`). Outs: OUT. LED: repeating. Use
`ClockSync` and `SYNC_DIV` for the clocked mode and `Lcg` for probability. Test: probability at 0
never repeats and at 1 repeats on every clock, with the repeat length matching LENGTH.

**SPREAD** `spread`, 4 HP, FX. A stereo imager: mid-side width control that stays mono-compatible.
Knobs: WIDTH (big, `cvIn`), WIDTH CV attenuverter, BASS MONO (the frequency below which the image
collapses to centre, log). Ins: L, R, WIDTH CV. Outs: L, R. Test: width at 0 gives identical L and R;
width at 1 preserves the input; the sum of L and R is unchanged by width, which is what mono
compatibility means.
