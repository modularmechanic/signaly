# Phase 04 — New modules batch A: sources and filters

Owns `src/modules/{wavetable,fmop,super,chaos,grain,diode,lpg,morph,reson}/` and nothing else.
Read `../module-authoring-conventions.md` first. Nine modules.

## Sources

**WAVETABLE** `wavetable`, 8 HP, SOURCES. A wavetable oscillator whose defining feature is the scan.
Build a small bank of 8 single-cycle waves computed at construction (sine → triangle → saw → square →
and four harmonically richer ones) and interpolate between adjacent tables on a continuous `pos`
control. Knobs: TUNE (big), FINE, POSITION with `cvIn`, POS CV attenuverter, FM AMT. Ins: V/OCT
(`kind: 'p'`), POS CV, FM. Outs: OUT. The test asserts that moving `pos` between two tables changes the
harmonic content monotonically, not merely that output is non-zero.

**FM OP** `fmop`, 6 HP, SOURCES. Two operators: a modulator at a ratio of the carrier, feeding the
carrier's phase. Knobs: TUNE (big), RATIO (discrete, `fmt: 'f1'`, snapped to a ratio table), INDEX with
`cvIn`, INDEX CV attenuverter, FEEDBACK. Ins: V/OCT (`'p'`), INDEX CV, SYNC. Outs: OUT. Test: index at
0 gives a pure tone, index up adds sidebands at carrier ± ratio.

**SUPER** `super`, 6 HP, SOURCES. Seven detuned saws, the classic unison stack. Knobs: TUNE (big),
DETUNE with `cvIn`, MIX (centre versus sides), DETUNE CV attenuverter. Ins: V/OCT (`'p'`), DETUNE CV.
Outs: L, R. Test: detune at 0 collapses to a single frequency, detune up widens the spectrum. Use
`blep` for the saws so they do not alias.

**CHAOS** `chaos`, 4 HP, SOURCES. A chaotic CV source, not a random one: a Lorenz attractor integrated
at control rate, plus a logistic map on a switch. Knobs: RATE (big, log), STRANGE (the system
parameter), LEVEL. Switch: MODE — LORENZ / LOGISTIC. Ins: RATE CV. Outs: X, Y, Z. Test: the same seed
produces the same trajectory, and two nearby seeds diverge (that is the defining property).

**GRAIN** `grain`, 10 HP, SOURCES. Granular texture from a live capture buffer. Knobs: SIZE (big, log,
ms), DENSITY, PITCH, SPRAY (randomness), POSITION with `cvIn`, POS CV attenuverter, MIX. Ins: IN,
POS CV, TRIG. Outs: L, R. Use `DL` for the buffer and `Lcg` for spray. Test: with spray at 0 the grain
onsets are periodic; with spray up they are not.

## Filters

**DIODE** `diode`, 4 HP, FILTERS. A diode ladder, audibly distinct from the existing transistor LADDER:
asymmetric saturation per stage and resonance that thins the low end. Knobs: CUTOFF (big, log, `cvIn`),
RES, CV AMT attenuverter, DRIVE. Ins: IN, FREQ CV, RES CV. Outs: OUT. Test: attenuation above cutoff,
and that drive adds harmonics the clean path does not have.

**LPG** `lpg`, 4 HP, FILTERS. The low pass gate the catalogue lacks. One vactrol model drives both
amplitude and brightness together, with a RESPONSE knob that sets the vactrol time constant. Knobs:
LEVEL (big), RESPONSE (log, ms), COLOUR (how far the gate opens the filter). Switch: MODE — LPG / VCA /
VCF. Ins: IN, CV, PING (a trigger that strikes the vactrol). Outs: OUT. Test: a ping produces an
exponential decay whose length tracks RESPONSE, and in LPG mode brightness falls with amplitude.

**MORPH** `morph`, 4 HP, FILTERS. One continuous sweep from low pass through band pass to high pass,
under CV. Build it on the same TPT topology as SVF and crossfade the three taps. Knobs: CUTOFF (big,
log, `cvIn`), RES, SHAPE with `cvIn`, SHAPE CV attenuverter. Ins: IN, FREQ CV, SHAPE CV. Outs: OUT.
Test: shape at 0, 0.5 and 1 matches the LP, BP and HP responses respectively.

**RESON** `reson`, 6 HP, FILTERS. Three tuned resonant peaks for struck and bowed tones. Knobs: FREQ
(big, log, `cvIn`), SPREAD (how far peaks 2 and 3 sit above peak 1), DECAY (log), FREQ CV attenuverter,
MIX. Ins: IN, FREQ CV, STRIKE. Outs: OUT. Test: a strike rings at the tuned frequency and decays over
the time DECAY sets.
