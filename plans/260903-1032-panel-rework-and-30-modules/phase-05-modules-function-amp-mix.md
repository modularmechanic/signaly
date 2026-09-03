# Phase 05 — New modules batch B: function, amp and mix

Owns `src/modules/{ad,slew,logic,compare,xfade,ring,matrix}/` and nothing else.
Read `../module-authoring-conventions.md` first. Seven modules.

## Function and control

**AD** `ad`, 4 HP, ENV / FUNC. A snappy attack-decay envelope that can loop into an LFO. Distinct from
the existing ADSR (no sustain stage) and from FUNKTION (which is a slope/slew utility). Knobs: ATTACK
(big, log, ms), DECAY (log, ms), CURVE (linear through exponential). Switch: LOOP — ONCE / LOOP.
Ins: TRIG (`kind: 'g'`), ATTACK CV, DECAY CV. Outs: ENV, EOC (end-of-cycle trigger, `'g'`). LED: the
envelope's own gate. Test: a trigger produces a rise over ATTACK then a fall over DECAY, and EOC fires
exactly once per cycle.

**SLEW** `slew`, 4 HP, ENV / FUNC. Two independent slew limiters with separate rise and fall, the
portamento the catalogue lacks. Knobs: RISE 1 (log, ms), FALL 1 (log, ms), RISE 2, FALL 2. Switch:
LINK — OFF / 1→2 (channel 1's setting drives both). Ins: IN 1, IN 2. Outs: OUT 1, OUT 2. Test: a step
input reaches its target over RISE and returns over FALL, with the two times independent.

**LOGIC** `logic`, 4 HP, ENV / FUNC. Boolean combination of two gates, all four results at once so it
is a utility rather than a mode switch. Knob: THRESHOLD (the voltage above which an input counts as
high). Ins: A (`'g'`), B (`'g'`). Outs: AND, OR, XOR, NOT A — all `'g'`. LEDs for A and B. Test: the
truth table, driven as real gate voltages through THRESHOLD rather than as booleans.

**COMPARE** `compare`, 4 HP, ENV / FUNC. A window comparator: a gate while the input sits between two
thresholds. Knobs: CENTRE (big, `cvIn`), WIDTH, CENTRE CV attenuverter. Ins: IN, CENTRE CV. Outs:
GATE (`'g'`), ABOVE (`'g'`), BELOW (`'g'`). LED: the window gate. Test: a ramp through the window opens
the gate exactly on entry and closes it on exit, and ABOVE/BELOW are mutually exclusive with it.

## Amp and mix

**XFADE** `xfade`, 4 HP, AMP / MIX. Voltage-controlled crossfade between two inputs, and a pan of the
result. Knobs: FADE (big, `cvIn`), FADE CV attenuverter, PAN with `cvIn`, PAN CV attenuverter. Ins:
A, B, FADE CV, PAN CV. Outs: L, R. Use a constant-power curve, not a linear one, so a sweep holds its
level. Test: at fade 0 and 1 the output equals A and B respectively, and the mid-point holds
constant power rather than summing to 2.

**RING** `ring`, 4 HP, AMP / MIX. True four-quadrant multiplication, which the existing VCA cannot do:
a negative carrier inverts the signal. Knobs: DEPTH (big, `cvIn`), OFFSET (bias the carrier toward
AM), DEPTH CV attenuverter. Ins: X, Y, DEPTH CV. Outs: OUT. Test: multiplying two sines produces sum
and difference frequencies with the carrier suppressed, and a negative Y inverts X.

**MATRIX** `matrix`, 12 HP, AMP / MIX. A 4 × 4 matrix mixer: sixteen level cells routing four inputs to
four buses. This is the widest module in the batch and its panel is the one to watch — sixteen small
knobs in a square grid plus eight jacks. Knobs: sixteen, `a1`…`d4`, `fmt: 'fPc'`, laid out row by row.
Ins: A, B, C, D. Outs: 1, 2, 3, 4. If sixteen knobs plus eight jacks will not fit 12 HP under phase
01's fit check, raise the HP in the def and report it rather than letting the panel overflow. Test:
input A at unity with only cell `a2` open appears on bus 2 and nowhere else.
