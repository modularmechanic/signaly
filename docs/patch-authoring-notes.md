# Patch authoring notes

House style for the bundled examples in `src/patches/`. A patch is a plain exported
`*.signaly.json`, so anything saved from the app can become one; these are the conventions the
shipped set follows. `tests/example-patches.test.ts` enforces the mechanical half.

## Wet by default

**Most instrumentation should be wet.** Dry voices sound like test tones — the reverb and delay
are what make the rack sound like a record. Unless a part is deliberately dry (a kick, a sub
bass), give it:

- a real send: `snd1` / `snd2` around 0.4–0.8, not a token 0.1
- returns near unity: `ret1` / `ret2` around 0.75–0.9
- send effects mixed **fully wet** (`mix: 1.0`) — the dry path is already in the mixer, so a
  half-wet return just muddies it
- generous tails: reverb `decay` 0.85–0.97 and `size` 1.5–2.5 for ambient, delay `fb` 0.5–0.85

Ambient wants the most of this; dub is built on it (tape echo `fb` up near 0.8, skank chords
that live almost entirely in the return). Even techno leads and percussion should be sent.

Use the mixer's **PRE** buttons on parts whose tail should outlive the fader — a pre-fader send
keeps ringing while you pull the channel down, which is the whole trick behind dub drops and
ambient swells.

## Ambient

- Pitches change on bar-length clocks, not on sixteenths.
- Swells are multi-second AD envelopes retriggered by a slow clock; an AD only needs the edge,
  so the clock's pulse width never cuts one short.
- Filters sit low with slow modulation. No plucks, no square leads, no percussive FM.

## Rhythmic genres

- One `trigseq` clocked at sixteenths is the drum grid: sixteen steps is one bar.
  `CLOCK` rates are `RATE_MULT` indices — 3 is a quarter, 4 an eighth, 5 a sixteenth.
- The pump comes from an inverted kick envelope: `ADSR` gated by the kick trigger, its `inv`
  output into the `cv` of the VCA carrying bass and chords.
- Deep house puts the open hat on the offbeat eighth; psy-trance puts the bass on the three
  sixteenths between kicks; dub leaves most of the bar empty.

## Arrangement

For a track rather than a loop, drive one **intensity CV** and let every element watch it:

1. `CLOCK ÷N` counts bars into a `SEQ-16` whose step pitches are the arrangement.
2. `COMPARE` per element against that CV — `above` for elements that enter as the track builds,
   `below` for the breakdown pad.
3. `SLEW` turns each comparator edge into a fade.
4. A `VCA` per element, gated by the slewed CV.

The same intensity CV can open filters and swell reverb size, so the room grows into the drops.
`src/patches/18-warehouse-cathedral-f-minor.signaly.json` is the worked example.

## Levels

MAIN OUT stays at or below 0.7 so a patch is safe to open. The test enforces it, along with
every clock being left running.
