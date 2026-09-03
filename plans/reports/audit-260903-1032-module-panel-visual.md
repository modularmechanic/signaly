# Module panel visual audit — 41 built-in modules

**Date** 2026-09-03 · **Branch** `fix/panel-layout-audit` · **Build** `npm run build` (clean) → `vite preview` on :4319
**Method** All 41 modules loaded into one rack via an injected patch, laid out in six rows grouped by HP.
Every number below is `getBoundingClientRect()` / `scrollWidth` / `Range.getBoundingClientRect()` read from the
running production build at DPR 1, viewport 2473×1266. Raw data:
[`panel-audit/measure.json`](panel-audit/measure.json), [`panel-audit/labels.json`](panel-audit/labels.json).
Screenshots: [`panel-audit/`](panel-audit/) — one PNG per module (`<hp>hp-<slug>.png`), one contact sheet per
width class (`sheet-02hp.png`, `sheet-04hp.png`, `sheet-06hp.png`, `sheet-10hp.png`, `sheet-large.png`,
`36hp-mix-8.png`), plus six `defect-*.png` close-ups.

**Report only — no source file was modified.**

Constants in play: `HP_PX = 26` (`src/core/types.ts:123`), `--panel-h: 658px` (`src/styles/tokens.css:67`),
so 2HP = 52px, 4HP = 104px, 6HP = 156px, 10HP = 260px. Measured panel widths matched exactly for all 41.

---

## 1. Verdict table

Severity: **blocker** = a control is unusable, unreadable or unreachable · **bad** = legible but visibly wrong
(truncated label, dead panel, web-form control) · **acceptable** = ships as is.

| Module | HP | Rec. HP | Severity | Problem (one line) |
|---|---:|---:|---|---|
| CLOCK ÷N (`clockdiv`) | 2 | 2 | bad | Name ellipsised to `CLOCK…` (ink 59px in a 44px box); 217px dead band between the LED and the jacks; no remove button. |
| COMB | 2 | 4 | bad | 4 knobs + 3 jacks in 52px → 32px knobs, 1-column stack, no room for the sub-line. |
| CRUSH | 2 | 6 | **blocker** | 6 knobs force 38.5px rows → knob art collapses to **17.9px**; not turnable. |
| DRUM 2 | 2 | 8 | **blocker** | 7 knobs → 26px rows → **all 7 knob labels deleted** by the `max-height:37px` container query; knobs 18.7px. |
| LADDER | 2 | 4 | bad | 5 knobs at 71px rows, 30–32px art, single column; labels at the minimum tracking. |
| NOISE | 2 | 2 | bad | Only 2 jacks: **fill ratio 0.19**, a 482px empty black rectangle above them. |
| VOLTS | 2 | 4 | **blocker** | The value display clips: `+0.00` needs 58px, the screen is 45px → user reads `+0.0`. |
| ADSR | 4 | 6 | acceptable | Works; the `env-vals` chip row (`10 250 60 400 / ms ms % ms`) is at its legibility floor. |
| DUAL ATN (`atn`) | 4 | 6 | bad | 6 knobs in one 90px column at 71px rows; sub ellipsised (`ATTENUVERT + OF…`). |
| CHORUS | 4 | 6 | bad | 6 knobs → 60.3px rows (under the 63px shrink threshold), 33.2px knobs; sub ellipsised. |
| DIST | 4 | 6 | bad | 6 knobs + a 3-way trough in 91px usable → 25.9px knobs, two jack labels wrap to 2 lines. |
| VOWEL (`formant`) | 4 | 4 | acceptable | Good; 119px dead band under the last knob. |
| FUNKTION (`func`) | 4 | 4 | acceptable | One of the best panels — 2 big knobs, a trough, 4 jacks, fill 0.71. |
| LFO | 4 | 4 | acceptable | Fine; 32.8px LED row is the only tight spot. |
| MIX 4 (`mix`) | 4 | 4 | acceptable | Fine; `MIX OUT` jack label wraps to 2 lines. |
| MULT | 4 | 2 | bad | 1 knob and 5 jacks: fill 0.35 with a **276.8px dead band** — 42% of the faceplate is empty. |
| SVF | 4 | 6 | acceptable | Fine; knob art varies 34.6–44.3px inside one module (inconsistent). |
| VCA ×2 | 4 | 6 | acceptable | Fine; 4 knobs + trough + 6 jacks is at the 4HP limit. |
| VCO | 4 | 8 | bad | 6 knobs + 8 jacks in 104px → 60px rows, **24.1px** smallest knob; sub ellipsised. |
| V/OCT (`voct`) | 4 | 4 | acceptable | Fine; `V/OCT IN` / `V/OCT OUT` jack labels wrap to 2 lines. |
| WASP | 4 | 4 | acceptable | Good — 42.6–54.5px knobs, fill 0.71. |
| ARP | 6 | 10 | **blocker** | 6 knobs in 51.4px rows → **19.3px** knob art; plus a 130px black display panel that draws nothing. |
| CLOCK | 6 | 8 | bad | `START/STOP` breaks mid-token to `START/S` + `TOP`; 28.5px knobs. |
| COMP | 6 | 8 | bad | `THRESHOLD` hard-clipped to `THRESHO` (89px of text in a 68px cell, no ellipsis). |
| DUO VCO | 6 | 10 | bad | `INTERVAL` clipped to `INTERVA` and butts against `DETUNE`; 7 knobs + 3 troughs at 32.6px art. |
| FLANGER | 6 | 8 | bad | `DEPTH CV` clipped in the knob row *and* wrapped in the jack row. |
| GATE | 6 | 8 | bad | Two labels clipped (`THRESHOLD`→`THRESHO`, `THRESH CV`→`THRESH C`); `GATE OUT` wraps. |
| KEYBOARD (`kbd`) | 6 | 10 | **blocker** | Piano widget then **368.7px of nothing**; fill 0.26 — the emptiest non-trivial panel. |
| MONOVOX | 6 | 10 | bad | 10 knobs in 2 columns at 63.4px rows → 25.9px art; the densest 6HP panel. |
| NOISE LAB | 6 | 8 | bad | `BURST DECAY`→`BURST DEC` and `COLOR CV`→`COLOR C` both hard-clipped at the panel edge. |
| MAIN OUT (`out`) | 6 | 6 | bad | 194.5px dead band around the VU meters; sub ellipsised (`STEREO · LIMITER · MET…`). |
| DELAY (`ddelay`) | 10 | 10 | bad | `SYNC` is a **native `<select>`** with the OS chevron — reads as a web form, not a module. |
| EUKLID | 10 | 10 | acceptable | Best of the computed panels: fill 0.69, 44.6–57px knobs, step LEDs read well. |
| QUAD VCO (`quad`) | 10 | 6 | bad | 3 `big` knobs each own a full 227px row → one 63px knob centred in 227px; fill 0.57; `SPREAD CV` clipped. |
| REVERB | 10 | 14 | bad | 11 knobs in 3 columns at 63.8px rows → **26.1px** art; label tracking already at minimum. |
| SCOPE | 10 | 10 | bad | The scope screen is a ~83px strip in a 658px panel with a 57px dead band under it — the display should own the slack. |
| S + H LAB (`snh`) | 10 | 10 | acceptable | Fine; `INT. RATE` clipped by 1px, 80px dead band. |
| TAPE ECHO (`tape`) | 14 | 14 | bad | Native `<select>` for SYNC; `REGEN CV` jack label wraps into the row above. |
| STEREO DELAY (`sdelay`) | 16 | 14 | bad | Native `<select>`; `TIME L`/`TIME R` are `big` so each owns a 4-column row with 3 empty cells. |
| SEQ-8 (`seq`) | 17 | 12 | **blocker** | fill **0.29** — 2 knobs (in a 4-column grid, 2 cells empty), a step strip, then a 204.7px void, then 4 jacks. |
| MIX 8 | 36 | 36 | acceptable | The only hand-authored `panel`. Fill 0.75, zero defects found. This is the reference. |

**Counts — blocker 6 · bad 23 · acceptable 12.**

---

## 2. Defects, ranked by blast radius

### D1 — `cols` divisor of 66px makes every 4HP panel a single column · **14 modules**

`src/modules/panel-layout.ts:128`

```ts
const cols = clamp(Math.floor(usablePx / 66), 1, 4);
```

4HP: `usablePx = 104 × (1 − 2×0.06) = 91.5` → `floor(91.5/66) = 1`. Measured: every one of the 14 4HP modules
has knob cells **90px wide, one per row** (`measure.json`, `knobW` column). The knob art caps at 46px
(`controls.css:30`, `--d: min(46px, 52cqh − 1.5px, 68cqw)`), so 44px of every knob row is dead horizontal
space, and modules with 6 knobs pay for it in row height instead: CHORUS 60.3px, VCO 60.1px, DIST 63.4px.

Two 45px columns fit inside 91.5px comfortably (a 37px jack already fits a 45.7px jack cell on the same panel —
`jackColsFor(4) = 2`). The knob grid is 1.5× coarser than the jack grid on the same faceplate for no reason.

### D2 — no minimum knob-row height · **8 modules, 1 blocker**

`src/modules/panel-layout.ts:156` — `Math.min(ROW_MAX, knobsH / weighted)` has a ceiling but no floor.

`src/styles/controls.css` reacts to the resulting row height in two steps:
* `@container (max-height: 63px)` (line 134) shrinks the knob and the label,
* `@container (max-height: 37px)` (line 154) **deletes the label entirely**.

Measured knob-row heights that trip these:

| Module | row h | knob art | effect |
|---|---:|---:|---|
| DRUM 2 | 26.0px | 18.7px | **7 labels removed** (`TONE SNAP CLICK LENGTH PITCH RESONANCE ADSR`) |
| CRUSH | 38.5px | 17.9px | knob smaller than the 37px jack next to it |
| ARP | 51.4px | 19.3px | 6 unusable knobs |
| VCO | 60.1px | 24.1px | |
| CHORUS | 60.3px | 33.2px | |
| DIST | 63.4px | 25.9px | |
| MONOVOX | 63.4px | 25.9px | |
| REVERB | 63.8px | 26.1px | |

See [`defect-drum2-unlabelled-knobs.png`](panel-audit/defect-drum2-unlabelled-knobs.png).

### D3 — knob labels truncate mid-word with no ellipsis · **7 modules, 9 labels**

`src/styles/controls.css:16-26`

```css
.knob-label { width: max-content; max-width: 100%; overflow: hidden; text-overflow: clip; }
```

`text-overflow: clip` (not `ellipsis`) means a too-long label reads as a *different, shorter word* with no cue:

| Module | label | needs | has |
|---|---|---:|---:|
| COMP | `THRESHOLD` → `THRESHO` | 89px | 68px |
| GATE | `THRESHOLD` → `THRESHO` | 89px | 68px |
| GATE | `THRESH CV` → `THRESH C` | 84px | 68px |
| NOISE LAB | `BURST DECAY` → `BURST DEC` | 84px | 68px |
| NOISE LAB | `COLOR CV` → `COLOR C` | 76px | 68px |
| DUO VCO | `INTERVAL` → `INTERVA` | 71px | 68px |
| FLANGER | `DEPTH CV` → `DEPTH C` | 74px | 68px |
| QUAD VCO | `SPREAD CV` → `SPREAD C` | 90px | 76px |
| S + H LAB | `INT. RATE` | 77px | 76px |

Note the contrast with `.switch-opt` (`controls.css:284`, *"Legends must never clip"*) — that rule was written
and honoured for switches; knob labels never got the same treatment. See
[`defect-comp-threshold-clipped.png`](panel-audit/defect-comp-threshold-clipped.png).

### D4 — leftover height is dumped as one dead band above the jacks · **11 modules with >50px of void**

`src/modules/panel-layout.ts:144-147` computes `knobsH` as *everything left over*, then line 156 caps the row
at `ROW_MAX = 0.15` (98.7px, or 125.3px for a `big` row). Anything the knobs cannot absorb becomes a single
empty strip, because jacks are pinned to `1 − BOTTOM_PAD − jacksH` (line 200).

Measured dead band (largest empty vertical gap between the header and the jacks):

| Module | dead band | fill ratio |
|---|---:|---:|
| NOISE | 482.5px | 0.19 |
| KEYBOARD | 368.7px | 0.26 |
| MULT | 276.8px | 0.35 |
| VOLTS | 230.9px | 0.48 |
| CLOCK ÷N | 217.5px | 0.47 |
| SEQ-8 | 204.7px | 0.29 |
| MAIN OUT | 194.5px | 0.47 |
| VOWEL | 119.1px | 0.56 |
| S + H LAB | 80.1px | 0.53 |
| SCOPE | 57.1px | 0.60 |
| V/OCT | 56.8px | 0.64 |

### D5 — the remove `×` · **21 modules** (7 blocked, 14 colliding)

`src/styles/rack.css:121-156`

**2HP — the button does not exist.** `@container (max-width: 85px) { .panel-x { display: none } }`
(rack.css:151-156). Measured `getComputedStyle(...).display === "none"` and a zero-width box on all seven 2HP
modules. `grep removeModule src/` shows only two user-facing removal paths —
`module-panel.tsx:74` (this button) and `module-panel.tsx:33-38` (Delete/Backspace on a focused panel). So a
pointer-only user **cannot remove CLOCK ÷N, COMB, CRUSH, DRUM 2, LADDER, NOISE or VOLTS at all.**
Evidence: [`defect-x-missing-2hp.png`](panel-audit/defect-x-missing-2hp.png).

**4HP — the button is NOT clipped; it collides with the module name.** This refutes the reported symptom, with
numbers. On every 4HP panel (border-box 104px, content box 102px):

* `.panel-x` box = **x 66 → 86**, y 5 → 25 (from `right: 17px; width: 20px; top: 4px`).
* Distance from the button's right edge to the panel's content edge = **17px**. Nothing is cut off by
  `overflow: hidden`.
* `.screw.tr` box = x 86 → 97. The button and the screw **abut exactly** (measured overlap 0.0px), so the ×
  sits in a 20px slot with zero breathing room on the right.
* `.module-head` (`src/styles/panel.css`, `padding: 19px 6px 0`) is the **full panel width** and centres
  `.module-name`. It reserves nothing for the screws or the button. Measured name-ink boxes vs the button box:

  | 4HP module | name ink (x) | horizontal overlap with `×` |
  |---|---|---:|
  | DUAL ATN | 16.2 → 87.8 | **20.0px** (the whole button) |
  | FUNKTION | 16.2 → 87.8 | **20.0px** |
  | CHORUS | 25.2 → 78.8 | 12.8px |
  | VCA ×2 | 25.2 → 78.8 | 12.8px |
  | VOWEL / MIX 4 / V/OCT | 29.6 → 74.3 | 8.3px |
  | ADSR / DIST / MULT / WASP | 34.1 → 69.9 | 3.9px |

  Vertically the name ink runs y 18 → 34 and the button box y 5 → 25 — a **7px overlap** on the ascenders.

**Root cause, named:** `.panel-x` at `src/styles/rack.css:121-127` is positioned into the top-right corner of
`.module-panel`, but `.module-head` in `src/styles/panel.css` occupies the same corner at full width with a
centred title. Neither reserves space for the other. On panels ≥6HP the centred name is short enough that the
collision is invisible; at 4HP the name is as wide as the head box and lands underneath the button; at 2HP the
container query gives up and deletes the button rather than solving the conflict. It is a *reservation* bug in
the header, not a clipping bug in the button.
Evidence: [`defect-x-button-4hp.png`](panel-audit/defect-x-button-4hp.png) (`.panel-x` forced to `opacity: 1`
in the browser only — no source change).

### D6 — jack labels wrap, and `overflow-wrap: anywhere` breaks mid-token · **19 modules**

`src/styles/cables.css:25-37` plus `jackColsFor` (`panel-layout.ts:31-32`, divisor **43**).

`jackColsFor` gives ~45.7px jack cells at every width (4HP → 2 cols, 6HP → 3, 10HP → 5). A 37px socket plus
`.jack-label { padding: 0 3px; font: 500 11px mono; letter-spacing: .06em }` leaves ~40px of text width, but a
9-character label needs ~63px. Result: 2-line jack labels on 19 modules —
`START/STOP`, `SAMPLE IN`, `V/OCT IN`, `V/OCT OUT`, `THRESH CV`, `GATE OUT`, `DEPTH CV`, `COLOR CV`,
`SPREAD CV`, `DECAY CV`, `DRIVE CV`, `LEVEL CV`, `SHAPE CV`, `CHORD CV`, `REGEN CV`, `VOWEL CV`, `MIX OUT`,
`FAT MIX`, `INT CLK`.

`overflow-wrap: anywhere` breaks inside a token when there is no space: CLOCK renders `START/S` / `TOP`
(see `sheet-06hp.png`, column 2).

### D7 — native `<select>` on 4 modules

`src/styles/controls.css:342-354` styles `.select select` but never sets `appearance: none`, so the OS
dropdown chevron and native control metrics survive. `src/ui/atoms/switch.tsx:12` — *"Radiogroup up to 4
options, a native select beyond that"* — routes DRUM 2 (`MODE`), DELAY, TAPE ECHO and STEREO DELAY (`SYNC`)
into it. This is the single most obvious "web page" tell on the whole rack.
Evidence: [`defect-native-select-delay.png`](panel-audit/defect-native-select-delay.png).

### D8 — `big` knobs claim a full-width row · **6 modules**

`src/modules/panel-layout.ts:71-77` — a `big` item gets `w: box.usable`. On a 10HP panel that is a 63.5px knob
centred in a 227px row: QUAD VCO (×3 — the whole module), STEREO DELAY (×2), REVERB, TAPE ECHO, EUKLID,
MAIN OUT. QUAD VCO's fill ratio of 0.57 on 260px of panel is entirely this rule.

### D9 — header text loses information at 2HP and 4HP · **10 modules**

`src/styles/panel.css` `@container (max-width: 85px)` sets `.module-sub { display: none }` — the subtitle is
gone on **all 7** 2HP modules — and the 44px name box ellipsises `CLOCK ÷N` (ink 59px), `DRUM 2`, `LADDER`.
At larger widths the sub still ellipsises on DUAL ATN (104px in 90px), CHORUS (106/90), VCO (96/90) and
MAIN OUT (152/142).

### D10 — `.text-screen` clips its value · **1 module, but it is a correctness bug**

`src/styles/rack.css:159-170` — `overflow: hidden`, fixed `14px` mono, no shrink-to-fit. VOLTS renders `+0.00`
into a 45px box that needs 58px, so the panel shows **`+0.0`**. A precision voltage source that cannot display
its last digit is broken, not merely tight.
Evidence: [`defect-volts-display-clipped.png`](panel-audit/defect-volts-display-clipped.png).

*Checked and clean:* no `.panel-node` box overlaps any other on any of the 41 panels, and no control's box
escapes the faceplate — the `c01` clamp at `panel-layout.ts:204-205` does its job. Switch legends never clip
(`switch-opt` scrollWidth excess is the 44px `::after` hit target, not text).

---

## 3. The density formula in `computePanel`

Three rules interact, and each fails at a different end of the range.

### 3.1 `cols` is a fixed 66px pitch (line 128)

```ts
const cols = clamp(Math.floor(usablePx / 66), 1, 4);
```

* **Too coarse at the bottom.** 4HP (91.5px usable) → 1 column, for 14 modules (D1). The knob art is at most
  46px, so 66px is 43% wider than the widest thing it has to hold.
* **Too coarse at the top.** The `, 4)` cap wastes wide panels. SEQ-8 is 17HP / 389px usable and gets 4 columns
  of 97px — but only has 2 knobs, so **two of the four cells are empty** and the module measures at fill 0.29.
  MIX 8, which authors its own panel, puts **9 controls per row** in 36HP and reaches fill 0.75.
* **No feedback from the knob count.** REVERB has 11 knobs at 10HP and gets 3 columns → 63.8px rows → 26px
  knobs. With 4 columns it would be 3 rows of ~85px and 46px knobs. The formula never asks how many knobs
  there are.

### 3.2 The row height has a ceiling but no floor (line 156)

```ts
Math.min(ROW_MAX, knobsH / weighted)
```

Below 63px `controls.css` starts shrinking the art; below 37px it deletes the label. `computePanel` is free to
emit 26px (DRUM 2). The layout engine and the stylesheet disagree about what a row is *allowed* to be.

### 3.3 Leftover height becomes one void (lines 144-147, 200)

`knobsH` is a residual. When the knobs cannot spend it — because `ROW_MAX` caps them — nothing else claims it,
so it appears as a single empty band immediately above the pinned jack rows. Eleven modules carry >50px of it;
NOISE carries 482px (D4).

### A better rule

1. **Derive `cols` from a real cell minimum, not 66.** The narrowest usable knob cell is ~44px (46px art, or
   37px art plus label at the tight tracking). Use the same pitch the jacks already use:
   `maxCols = Math.floor(usablePx / 44)` → 4HP 2, 6HP 3, 10HP 5, 14HP 7. That alone fixes D1 for 14 modules.
2. **Pick `cols` from the knob count, then clamp.** Choose the smallest `cols ≤ maxCols` for which
   `knobsH / knobWeight(knobs, cols) ≥ ROW_MIN`. Set `ROW_MIN = 0.096` (63.2px at `--panel-h: 658px`) so the
   engine can never land in the stylesheet's shrink band. If even `maxCols` cannot reach `ROW_MIN`, the module
   is genuinely too narrow — that is the signal to raise its HP, and it is exactly the set flagged blocker
   above (CRUSH, DRUM 2, ARP).
3. **Cap `cols` by the knob count too**: `cols = Math.min(cols, knobs.length)`. SEQ-8's two empty grid cells
   and STEREO DELAY's three-empty-cell `big` rows both come from laying out a 4-wide grid for 2 items.
4. **Give the surplus to the display instead of to nothing.** When `knobsH / weighted` clamps at `ROW_MAX`,
   spend the remainder on `displayH` if the module has a display, otherwise distribute it as inter-row gap.
   One rule fixes SCOPE (83px screen, 57px void), ARP (130px empty screen), KEYBOARD (369px void), SEQ-8
   (205px void) and MAIN OUT (195px void around the meters).
5. **Let a `big` knob span a *fraction* of the row, not all of it.** `w: box.usable` should be
   `w: box.usable * Math.min(1, 2 / cols)` — a big knob takes two cells, not the whole panel. QUAD VCO,
   REVERB, TAPE ECHO and STEREO DELAY all recover their horizontal budget.

Cheapest first cut, in blast-radius order: change the `66` to `44` (D1, 14 modules), add `ROW_MIN` with a
column-widening retry (D2, 8 modules), change `text-overflow: clip` to `ellipsis` on `.knob-label`
(D3, 7 modules).

---

## 4. Eurorack character

### What reads as hardware

**MIX 8** ([`36hp-mix-8.png`](panel-audit/36hp-mix-8.png)) — and it is the only module that authors its own
`panel`. It is not better because it is wide; it is better because it is *organised*:

* controls form **labelled columns** (CH1…CH8, then MAIN), each column one signal path;
* the EQ section is separated by **vertical hairlines** into LO / LM / HM / HI groups — the accent colour used
  as silkscreen, not just as the 1px header rule;
* the jack field is a clean two-row block pinned to the bottom, sends and outs boxed in accent;
* every control in a row shares a baseline, so the eye reads across.

**FUNKTION**, **WASP**, **EUKLID** and **VOWEL** also read as modules: few controls, big art, a clear
knobs→switch→jacks silhouette.

### What reads as a web form

* **DELAY / TAPE ECHO / STEREO DELAY** — a native `<select>` with an OS chevron sitting in the middle of a
  black faceplate. Nothing else on the panel says "browser"; this says it loudly.
* **SEQ-8** — two knobs top-left, a strip of HTML number boxes, then 200px of void. It reads as a form with a
  table in it.
* **KEYBOARD** — a piano widget bolted to the top of an otherwise blank rectangle.
* **DRUM 2** — seven unlabelled circles in a vertical stack over a dropdown.
* **ARP** — a black rectangle where a screen should be, with nothing drawn in it.

### The structural difference, and what to change

1. **Nothing aligns between neighbours.** Each module divides *its own* usable width by *its own* `cols`, so
   knob rows in adjacent panels sit at different heights and different x-pitches (compare ARP and CLOCK in
   [`sheet-06hp.png`](panel-audit/sheet-06hp.png)). A real rack reads as a rack because every panel is drilled
   on the same grid. **Change:** define the column pitch and the row pitch in absolute px (a multiple of HP_PX),
   not as a fraction of each panel — `cellW = 44px`, `rowH ∈ {63, 84, 105}px` — and let panels round to it.
2. **Group separation is missing.** The only accent on a faceplate is the 1px hairline at 9%
   (`panel.css`, `.module-panel::after`). MIX 8 proves the idea works. **Change:** emit a `rule` panel node
   between the knob block, the switch block and the jack block, drawn as a 1px `--cat` hairline with a
   centred silkscreen legend (`CV`, `AUDIO`, `MOD`) — a `<fieldset>` legend in hardware clothing.
3. **The jack field is right; make it a real field.** Jacks pinned to the bottom is already correct Eurorack.
   **Change:** give the jack block a recessed background band (the same inset shadow recipe the display screens
   use) so it reads as a separate zone, and widen the jack cell from 43px to 48px so 8-character labels stop
   wrapping (D6).
4. **Empty panels need silkscreen, not emptiness.** A real 2HP noise module is covered in printing. NOISE
   (fill 0.19), KEYBOARD (0.26), SEQ-8 (0.29), MULT (0.35) each have hundreds of px of untouched black.
   **Change:** when `fillRatio < 0.45`, emit a `silkscreen` node in the dead band — module name in outline
   type, a signal-flow arrow from the in jack to the out jack, or the category word — rather than leaving
   `computePanel`'s residual visible.
5. **The screws are good; the corner is over-subscribed.** `.screw` at 6px from each corner is exactly right.
   But the top-right corner holds a screw *and* the remove button *and* the centred module name (D5).
   **Change:** move `.panel-x` out of the faceplate — into a hover chrome layer above the panel, or the
   bottom-right corner below the jack field — and give `.module-head` a `padding-right` that reserves the
   screw band, so the name is centred in the space it actually owns. That also unblocks 2HP.
6. **Kill the native select.** Replace `.select select` with `appearance: none` plus a drawn indicator, or —
   better for character — render >4 options as a rotary switch (a knob with detented positions and a printed
   legend arc), which is what a hardware SYNC divider actually is.
7. **Displays should breathe.** Every screen is a fixed height (`scope-screen canvas` 75px, `env-screen` 63px,
   `mini-piano` 81px) inside a panel that may have 300px spare. **Change:** make display nodes `flex`-like —
   claim the leftover from rule 3.4 above — so SCOPE looks like a scope and KEYBOARD looks like a keyboard
   controller.

---

## 5. Screenshot index

| File | Contents |
|---|---|
| `panel-audit/sheet-02hp.png` | CLOCK ÷N, COMB, CRUSH, DRUM 2, LADDER, NOISE, VOLTS |
| `panel-audit/sheet-04hp.png` | all 14 4HP modules |
| `panel-audit/sheet-06hp.png` | all 10 6HP modules |
| `panel-audit/sheet-10hp.png` | all 6 10HP modules |
| `panel-audit/sheet-large.png` | TAPE ECHO, STEREO DELAY, SEQ-8 |
| `panel-audit/36hp-mix-8.png` | MIX 8 |
| `panel-audit/<hp>hp-<slug>.png` | one PNG per module, 41 files, cropped to the exact panel box |
| `panel-audit/defect-x-missing-2hp.png` | 2HP headers with `.panel-x` forced visible — no button on any of them |
| `panel-audit/defect-x-button-4hp.png` | 4HP headers, `.panel-x` forced visible, sitting on the module name |
| `panel-audit/defect-drum2-unlabelled-knobs.png` | DRUM 2's seven unlabelled knobs |
| `panel-audit/defect-comp-threshold-clipped.png` | `THRESHO` / `RATIO` on COMP |
| `panel-audit/defect-volts-display-clipped.png` | VOLTS showing `+0.0` |
| `panel-audit/defect-native-select-delay.png` | the native SYNC dropdown on DELAY |
| `panel-audit/measure.json` | per-panel node boxes, gaps, fill ratios, header boxes |
| `panel-audit/labels.json` | per-label clip / hidden / wrap state and knob art sizes |

## 6. Things I could not measure

* Hover and focus states beyond `.panel-x` (I forced only its opacity, in the browser, to photograph it).
* Touch/coarse-pointer layout (`@media (pointer: coarse)` in `controls.css:365`) — the audit ran with a mouse.
* Live display rendering with signal present: SCOPE, MAIN OUT meters, ARP and CLOCK screens were photographed
  idle, because the audit made **no audio connections** (deliberately: no cable was patched anywhere, and the
  OUT level was never raised).
* Whether the ARP display rectangle is empty by design or failing to draw — it renders as a plain black box
  with no signal, and I did not drive it.
