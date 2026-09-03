# Phase 07 — New modules batch D: voices, sequencing and drums

Owns `src/modules/{fmvoice,pluck,quant,turing,burst,sswitch,kick,hats}/` and nothing else.
Read `../module-authoring-conventions.md` first. Eight modules.

## Voices

**FM VOICE** `fmvoice`, 12 HP, VOICES. A complete four-operator FM voice with selectable algorithm —
the deepest module in the batch and the widest. Knobs: TUNE (big, `cvIn`), four RATIO knobs (discrete,
snapped to a ratio table), four LEVEL knobs, ATTACK (log), DECAY (log). Switch: ALGORITHM — at least
four routings (stack, two-carrier, parallel, feedback stack). Ins: V/OCT (`kind: 'p'`), GATE (`'g'`),
TUNE CV. Outs: OUT. LED: gate. Test: switching algorithm with identical operator settings changes the
spectrum, and ratio 1:1 with index 0 gives a sine at the tuned pitch.

**PLUCK** `pluck`, 6 HP, VOICES. Karplus-Strong physical modelling: a burst of noise into a tuned
delay with a damping filter. Nothing else in the catalogue models a physical string. Knobs: TUNE (big,
`cvIn`), DAMP (the loop filter cutoff, log), BRIGHT (the excitation's spectrum), DECAY, TUNE CV
attenuverter. Ins: V/OCT (`'p'`), TRIG (`'g'`), TUNE CV. Outs: OUT. Use `DL` for the string and
`OnePole` for damping. Test: a trigger rings at the tuned frequency and the ring time tracks DECAY.

## Sequencing and control

**QUANT** `quant`, 6 HP, SEQ / CTRL. Snap incoming CV to a musical scale — a conspicuous gap. Knobs:
TRANSPOSE (semitones, `fmt: 'fSemi'`), GLIDE (log, ms). Switches: SCALE (CHROMATIC / MAJOR / MINOR /
DORIAN / PENTATONIC / WHOLE TONE) and ROOT (twelve note names, `fmt: 'fKey'` on a knob if a
twelve-option switch is too wide for the panel). Ins: IN (`'p'`), TRIG (`'g'` — sample only on a
trigger when patched). Outs: OUT (`'p'`), CHANGE (`'g'`, a trigger when the quantized note changes).
Test: a slow ramp through two octaves produces only degrees of the selected scale, and CHANGE fires
exactly on each new note.

**TURING** `turing`, 8 HP, SEQ / CTRL. The looping shift register: random that repeats. Knobs:
PROBABILITY (big — locked loop at the extremes, fully random at centre), LENGTH (discrete steps, 2–16,
`fmt: 'fInt'`), SCALE (output range), OFFSET. Ins: CLOCK (`'g'`), PROB CV. Outs: CV, GATE (`'g'`),
INVERT (`'g'`). LEDs for the register bits if they fit. Use `Lcg`. Test: with probability locked the
sequence repeats exactly every LENGTH clocks; at centre it does not.

**BURST** `burst`, 4 HP, SEQ / CTRL. Ratcheting: fire n triggers across one gate. Knobs: COUNT
(discrete 1–16, `fmt: 'fInt'`, `cvIn`), SPACING (log, ms), COUNT CV attenuverter, CURVE (accelerate
or decelerate the burst). Ins: TRIG (`'g'`), COUNT CV. Outs: OUT (`'g'`), EOC (`'g'`). Test: one
trigger produces exactly COUNT output pulses, and CURVE makes their spacing non-uniform.

**SWITCH** `sswitch`, 4 HP, SEQ / CTRL. A sequential switch, one signal among four, clocked — routing
the catalogue cannot currently do. Knob: STEPS (discrete 2–4, `fmt: 'fInt'`). Switch: DIRECTION —
1→4 (one in, four out) / 4→1 (four in, one out). Ins: CLOCK (`'g'`), RESET (`'g'`), IN, plus IN 2–4
for the 4→1 direction. Outs: OUT 1–4. LEDs for the active step. Test: successive clocks advance the
active channel and RESET returns it to the first; a signal appears only on the active channel.

## Drums

Both drum voices are `native: false` worklet modules like DRUM 2, and both must be silent until
triggered — no idle output.

**KICK** `kick`, 6 HP, DRUMS. A dedicated analog-style bass drum: a pitch envelope into a sine, a
click transient, and drive. Knobs: TUNE (big, log), PITCH DECAY (log, ms), AMP DECAY (log, ms), CLICK,
DRIVE, LEVEL. Ins: TRIG (`'g'`), ACCENT (`'c'`), TUNE CV. Outs: OUT. LED: trigger. Test: a trigger
produces a burst whose instantaneous frequency falls over PITCH DECAY, and amplitude decays over AMP
DECAY.

**HATS** `hats`, 6 HP, DRUMS. Metallic hi-hat from a bank of detuned square oscillators through a high
pass, with closed and open decays from one core. Knobs: TONE (big, log — the high pass), CLOSED DECAY
(log, ms), OPEN DECAY (log, ms), METAL (how inharmonic the oscillator bank is), LEVEL. Ins: CLOSED
(`'g'`), OPEN (`'g'`), ACCENT (`'c'`). Outs: OUT. A closed trigger must choke a ringing open hat, as
on real hardware. Test: the choke — an open hat's tail stops when a closed trigger arrives.
