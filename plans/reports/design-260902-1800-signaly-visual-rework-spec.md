# Signaly visual rework — design spec: Blackline (boutique-dark)
Date: 2026-09-02. Chosen after a three-angle design study (analog-studio, boutique-dark, colour-blocked); the other two proposals and the judging pass were lost to a session limit, so this is the surviving proposal, adopted on its merits.
Constraints it was written against: no resemblance to the old modvibez look; still skeuomorphic Eurorack; all 40 layouts COMPUTED by panel-layout.ts; Eurorack ratio 5.08:128.5; CSS only, no images beyond inline SVG data URIs, no new deps; ARIA slider knobs, button jacks, radiogroup switches; contrast >= 4.5:1, 44px touch targets, CVD-safe kind colours paired with line style + glyph.

## 1. Concept

Every faceplate is the same near-black matte anodised aluminium with a faint grain; category is expressed only by one accent hue on thin things — a hairline rule under the header, the knob value ring, the fader fill, the LED core and the switch's lit option — never as a panel tint. Controls are machined black hardware: knurled-edge knobs with a single backlit white pointer, black Thonkiconn-style jacks whose only colour is a thin kind-coded ring, recessed switch troughs, hex-socket screws. Typography is small, light-weight, widely tracked and "backlit" (no heavy 700 uppercase blocks). This inverts modvibez on every axis: it had category-tinted gradient panels, a colour-filled gradient header band, amber-filled switch buttons, big silver dome screws, coloured output pads and bold 700 labels; Blackline has uniform black panels, a text-only header over a hairline, hollow lit switches, black hex screws, ring-only jacks, 500-weight tracked labels, and a bigger 18/455 module grid.

## 2. tokens.css

```css
:root {
  /* signal kinds — audio / pitch / gate / cv. Okabe-Ito-derived, lifted for a black ground;
     always paired with ring line-style (solid/dashed/double/dotted) + glyph (● ◆ ■ ▲). */
  --kind-a: #ffb02e;
  --kind-p: #5ab4ff;
  --kind-g: #ff5fa0;
  --kind-c: #35d0a6;

  /* surfaces (app chrome: topbar, modals, browser) */
  --bg: #0a0a0b;
  --bg-2: #111113;
  --rail: #1b1c20;
  --surface: #1c1d21;
  --surface-2: #26272c;

  /* NEW: faceplate + machined-part surfaces (faceplates no longer use --surface) */
  --panel: #141416;        /* matte anodised black faceplate */
  --panel-dark: #0d0d0f;   /* def.dark variant */
  --metal: #26272b;        /* knob face / jack nut / fader cap top */
  --metal-2: #0f1012;      /* knurl valleys, jack hole, recess floors */
  --pointer: #f4f5f7;      /* backlit indicator lines (knob pointer, fader line) */
  --screen: #050607;       /* display glass */
  --grain: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>"); /* 7% white speckle, tiled */

  /* text */
  --text: #e6e8eb;
  --text-dim: #8d939c;
  --text-invert: #0a0a0b;

  /* lines + focus */
  --border: rgba(0, 0, 0, 0.7);
  --border-soft: rgba(255, 255, 255, 0.07);
  --focus: #9ad5ff;
  --focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--focus);

  /* accents */
  --amber: #f3c77a;   /* backlit ivory: unit labels, patch tip, btn.on, live region */
  --led: #ffd166;     /* LED fallback when no --cat / colour is given */
  --danger: #ff5d5d;

  /* category accent hues — thin things only (header rule, knob ring, fader fill, LED, lit switch).
     Must match CAT_COLOR in src/core/types.ts */
  --cat-sources: #ff6a3d;
  --cat-filters: #ffc247;
  --cat-env-func: #4ade80;
  --cat-amp-mix: #c8b48a;
  --cat-fx: #a78bfa;
  --cat-voices: #ff5c8a;
  --cat-seq-ctrl: #5aa9ff;
  --cat-drums: #ff9a3d;
  --cat-meters: #2dd4bf;
  --cat-output: #e5e7eb;
  --cat-utility: #b0b6c0;
  --cat-custom: #e879f9;

  /* geometry — must match HP_PX / PANEL_H in src/core/types.ts (5.08 : 128.5) */
  --hp: 18px;
  --panel-h: 455px;

  /* radii — sharper, machined */
  --r-sm: 2px;
  --r-md: 4px;
  --r-lg: 8px;

  /* type */
  --font-ui: -apple-system, system-ui, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}
```

## 3. Typography

All system stacks; nothing 700 on the faceplate. Contrast on --panel #141416: --text 13.9:1, --text-dim 6.0:1, --amber 10.8:1, darkest cat accent (--cat-voices) 6.1:1, darkest kind (--kind-g) 6.2:1 — all ≥ 4.5:1.
- Module name (.module-name): --font-mono 600, 11px, letter-spacing 0.22em, uppercase, color --text, text-shadow 0 0 6px color-mix(in srgb, var(--cat) 45%, transparent) (backlit). At ≤3 HP (container query on .module-panel, width < 60px): 8px, letter-spacing 0.08em.
- Module sub (.module-sub): --font-ui 500, 7px, letter-spacing 0.2em, uppercase, color --text-dim, margin-top 2px. Hidden at width < 60px.
- Knob/fader label (.knob-label): --font-ui 500, var(--label-fs) = clamp(7px, calc(var(--hp-count) * 1.4px), 9px), letter-spacing 0.14em, uppercase, color #cfd3d8 (opacity 1 — no 0.84), line-height 1.1.
- Switch label / select label / LED label: --font-ui 500, 7px, letter-spacing 0.16em, uppercase, --text-dim.
- Switch option text: --font-mono 600, 7.5px, letter-spacing 0.08em, uppercase. Off: --text-dim. On: var(--cat) + text-shadow 0 0 5px var(--cat).
- Jack label: --font-mono 500, 8px, letter-spacing 0.06em, uppercase; inputs --text on transparent (no box); outputs var(--jc) on --metal-2 pill (see controls).
- Values (env chips, seq pitch, patch tip): --font-mono 600, 9px, color --amber; chip captions --font-mono 600 7px --text-dim.
- Unit label (.panel-label.unit): --font-mono 500 8px --amber, no uppercase.
- Row header (.row-head): --font-mono 500, 10px, letter-spacing 0.14em, uppercase, --text-dim.
- Brand: --font-mono 700 12px letter-spacing 0.3em.

## 4. Controls

KNOB (markup unchanged: div.knob[role=slider] > div.knob-cap [+ i.knob-cv]; ::before = ring + 44px target)
- Sizes: small 32px, big 44px (coarse pointer: 38 / 50). Shrink guard for dense panels: width:min(32px, 58cqh) / big min(44px, 62cqh) (panel-node is already container-type:size).
- Body (.knob) background, top layer first: (1) face: radial-gradient(circle at 38% 32%, #35373c 0, var(--metal) 45%, #1a1b1e 100%) sized to the inner 76% via `radial-gradient(circle, <face> 0 74%, transparent 75%)`; (2) knurl: repeating-conic-gradient(from 0deg, #33353a 0deg 3deg, var(--metal-2) 3deg 7.5deg). box-shadow: 0 3px 5px rgba(0,0,0,.7), 0 0 0 1px #050506, inset 0 1px 0 rgba(255,255,255,.14). Border-radius 50%, cursor ns-resize.
- Cap/pointer (.knob-cap): 2px × 36% of knob, top 50%, margin-left -1px, transform-origin 50% 0 (rotation as now), background var(--pointer), border-radius 1px, box-shadow 0 0 3px color-mix(in srgb, var(--cat) 60%, transparent). No dot, no skirt.
- Value ring (.knob::before): inset -6px (big -7px), min 44px, conic-gradient(from 225deg, var(--cat) calc(var(--pct)*270deg), rgba(255,255,255,.10) 0 270deg, transparent 0), mask radial-gradient(closest-side, transparent 0 84%, #000 86%) → a 2px accent arc floating 4px outside the knurl. Ring start tick: none.
- CV marker (.knob-cv): 2px × 52%, color --kind-c, glow 0 0 4px, as now.
- Hover: filter brightness(1.08) on .knob (skip in reduced-motion? filters are static — keep).
- Active drag: no scale.

FADER (markup unchanged)
- Track (.fader): width 14px (coarse 18px), slot drawn as linear-gradient(90deg, transparent 4px, var(--metal-2) 4px 10px, transparent 10px) over transparent, plus accent fill: linear-gradient(to top, var(--cat) 0 calc(var(--pct)*100%), transparent 0) masked to the same 6px slot (second background layer, background-clip content-box with padding 0 4px). box-shadow inset 0 1px 2px #000 on the slot via an inset pseudo is not available (::after is the 44px target) → use `outline: 0` and draw the slot edge with linear-gradient stops (#000 4px 5px, var(--metal-2) 5px 9px, rgba(255,255,255,.08) 9px 10px).
- Cap (.fader-cap): 24×13px, left -5px, border-radius 2px, background linear-gradient(#34363b, var(--metal) 40%, #16171a); knurl on the cap: repeating-linear-gradient(90deg, rgba(255,255,255,.06) 0 1px, transparent 1px 3px) as top layer; border 1px solid #050506; box-shadow 0 2px 4px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.16). ::after indicator line: top 5.5px, 2px high, background var(--pointer), box-shadow 0 0 3px var(--cat).
- Min-height 56px.

SWITCH (radiogroup markup unchanged)
- .switch-opts: recessed trough — background var(--metal-2), border 1px solid #050506, border-radius 3px, box-shadow inset 0 1px 3px #000, inset 0 -1px 0 rgba(255,255,255,.05), gap 0, padding 1px.
- .switch-opt: padding 3px 5px (coarse 6px 8px, min-height 28px), min-width 16px, border-radius 2px, background transparent, color --text-dim, text as in typography. Hover (not .on): color --text.
- .switch-opt.on: color var(--cat); text-shadow 0 0 5px var(--cat); background rgba(255,255,255,.04); box-shadow inset 0 -2px 0 var(--cat) (2px accent bar under the lit option). No fill block — this is the backlit-legend look.
- Focus: --focus-ring on the option; :focus-visible only.
- .btn: same trough treatment as a single option; .btn.on: color var(--amber), box-shadow inset 0 -2px 0 var(--amber), 0 0 6px color-mix(in srgb, var(--amber) 35%, transparent).
- .select select: background var(--metal-2), border 1px solid #050506, color --amber, mono 600 8px.

JACK (markup unchanged: button.jack.jack-<kind>[.out][.patched] > span.jack-glyph; ::after = 44px target)
- Size 26px (coarse 32px). border: 1.5px <kind style> var(--jc) — styles stay: a solid, p dashed, g double (border-width 3px), c dotted. This ring is the ONLY colour on the socket.
- Body background, top to bottom: (1) hole: radial-gradient(circle, #000 0 4px, var(--metal-2) 4px 5px, transparent 5px); (2) nut knurl: repeating-conic-gradient(from 0deg, #303236 0deg 4deg, var(--metal-2) 4deg 9deg) clipped by radial-gradient(circle, transparent 0 5px, #000 5px 10px, transparent 10px) via a second mask is not possible on one element → instead draw the nut as radial-gradient(circle, #000 0 4px, #1a1b1e 4px 5px, #2c2e32 5px 9.5px, #0b0c0d 9.5px 10.5px, transparent 10.5px) and the knurl as the bottom layer repeating-conic-gradient(#2a2c30 0 4deg, #121315 4deg 9deg) which shows only in the 10.5px→edge annulus (2px) just inside the coloured ring. Reads as a black nut with a machined edge.
- box-shadow: 0 1px 2px #000, inset 0 0 3px #000.
- Glyph (.jack-glyph): 6px, color var(--jc), opacity .9, sits in the hole centre (grid place-items as now).
- Labels: input .jack-label — no box, no border, --text mono 8px, padding 0 2px. Output .jack-label — background var(--metal-2), border 1px solid color-mix(in srgb, var(--jc) 55%, #000), border-radius 2px, color var(--jc), padding 1px 4px. .jack.out: no pad; instead box-shadow 0 0 0 1px #000, 0 0 0 2px color-mix(in srgb, var(--jc) 35%, transparent) (a faint second ring marks outputs).
- Patched (.jack.patched): hole becomes a plug tip — first background layer changes to radial-gradient(circle at 42% 38%, #9ea3ab 0, #5c6067 40%, #2a2c30 62%, #000 70%, transparent 71%) (4.5px radius silver tip), glyph opacity 0, border-color stays kind, border-style forced solid for a/p/c and double stays for g. Plus box-shadow inset 0 0 0 1px var(--jc) at 40% so the ring reads brighter.
- Armed (.jack.hot, [aria-pressed=true]): box-shadow 0 0 0 2px var(--jc), 0 0 12px var(--jc); animation jack-pulse 1.1s ease-in-out infinite alternating the outer blur 8px→16px (disabled under reduced-motion).
- Compat (.jack.compat): outline 2px dashed var(--jc); outline-offset 3px; no fill change. Non-compat jacks during a drag are unchanged (no dimming).
- Focus: --focus-ring via :focus-visible (wins over .out ring because it is a later rule).

SCREW (markup unchanged: i.screw.<corner>)
- 8px circle, inset 4px from the panel corners (tl: top 4px left 5px etc.). Body: radial-gradient(circle at 35% 30%, #45474c 0, #2b2d31 45%, #141517 100%); box-shadow 0 0 0 1px #000, inset 0 1px 0 rgba(255,255,255,.12). ::after: hex socket — width/height 4px, centered, background #050506, clip-path polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0 50%), transform none (no slot line). Reads as a black button-head hex screw.

LED (one-line markup tweak in led.tsx, see markupChanges)
- Glass 7px circle. Background radial-gradient(circle at 40% 35%, var(--led-c) 0, color-mix(in srgb, var(--led-c) 55%, #000) 55%, #000 100%); box-shadow 0 0 0 1px #050506, 0 0 6px var(--led-c), 0 0 14px color-mix(in srgb, var(--led-c) 45%, transparent). Off state comes from the atom's opacity 0.15 (glass reads as dark bead through the 1px black rim; keep the rim unaffected by opacity by moving the 0 0 0 1px ring to .led-cell — no: keep simple, opacity on the whole bead is acceptable). transition opacity 0.05s linear. --led-c defaults to var(--cat).
- .led-label: 7px, --text-dim, gap 3px.

DISPLAY BEZEL (.scope-screen, .env-screen, .text-screen, .mini-piano, .channel-vu share one recipe)
- Recess: border 1px solid #000; border-radius 3px; background var(--screen); box-shadow inset 0 2px 6px #000, inset 0 0 0 1px rgba(255,255,255,.04), 0 0 0 1px rgba(255,255,255,.05) (a 1px machined lip outside). Scanline overlay: background-image repeating-linear-gradient(0deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px) over var(--screen). Padding 3px.
- Screen ink: scope trace colour var(--cat); text-screen colour --text (white OLED) 10px mono 600; env trace var(--cat); VU fill linear-gradient(var(--danger), var(--amber) 30%, var(--cat)). Canvas heights: scope 52px, env 44px.
- Step grid buttons (.seq-gate/.seq-pitch): trough style like switch-opts; lit step = var(--cat) with 0 0 6px glow.
- Mini piano: white keys linear-gradient(#e9eaec, #c8cbd0), black keys linear-gradient(#26272b, #0b0c0d); .on = var(--cat) gradient.

CABLES (cable-canvas.tsx constants: SAG 14, WIDTH 3, sag factor 0.16)
- Per cable, drawn in this order: (1) shadow: same curve offset y+5, strokeStyle rgba(0,0,0,.55), lineWidth 7; (2) jacket: strokeStyle color-mix(kind 70%, #000) computed as `shade` per kind — read via a 2nd canvas trick is not needed: precompute by drawing kind colour at globalAlpha .55 over black is expensive → simply use lineWidth 5 with strokeStyle '#0a0a0b' then lineWidth 3 with the kind colour; (3) highlight: lineWidth 1, strokeStyle rgba(255,255,255,.22), offset y-0.5. lineCap round. Kind is also encoded by dash: audio solid, pitch setLineDash([10,5]), gate setLineDash([3,3]) on the highlight pass only (jacket stays solid so the cable still reads as a rope), CV setLineDash([1,4]) on the highlight pass.
- Plug ends: fill circle r 6px '#0e0f11', stroke 2px kind colour, then r 2px fill '#050506' (the plug's centre pin).
- Drag cable: same, jacket alpha 0.85.
- Reduced motion: no change (cables are static).

## 5. Computed layout rules

> Scale note (2026-09-02, after user feedback "everything is so small"): the grid was rescaled from 18px/455px to **--hp 26px / --panel-h 658px** (still 5.08:128.5). Rules 3, 9, 13 and 14 below are restated at the new scale; every other px figure quoted in §2, §4, §5 and §7 is at the old 18/455 scale — multiply by 1.44.

All fractions are of PANEL_H = 658px (1 HP = 26px). usablePx = hp*26 − 2*padPx.
1. Padding: PAD_X = 0.03 of width for hp ≤ 3, 0.06 otherwise (2 HP → 1px, 4 HP → 4px, 16 HP → 17px). Bottom pad = 0.018 (8px).
2. Header band: y 0 → 0.09 (41px). Name baseline at 15px, sub at 27px. Screws at 4px corners, panel-x at top 3px right 12px (hidden at hp ≤ 3, shown on hover/focus-within elsewhere). Hairline rule at y = 0.09: 1px, width 100%, linear-gradient(90deg, transparent, var(--cat) 18% 82%, transparent). Nothing else is category-coloured in the header.
3. Knob columns: cols = clamp(floor(usablePx / 66), 1, 4) → 2 HP:1, 4 HP:1, 6 HP:2, 8 HP:2, 10 HP:3, 12 HP:4, 16 HP:4 (usablePx 49 / 92 / 137 / 183 / 229 / 275 / 366). Column width = usable/cols; knob-cell centred in it.
4. Knob row heights: small row 0.15 (68px = 32 knob + 12 ring margin + 3 gap + 10 label + slack); big row 0.19 (86px). A big knob spans the full usable width on its own row (as now); its label sits below at the same 3px gap.
5. Knob block placement: starts at y = 0.09 + 0.02 (9px breathing room under the rule). Row height per row = clamp(knobsH / weightedRows, 0.12, 0.15) where weightedRows = smallRows + 1.27*bigRows (big rows get 1.27× the small row height). knobsH = 1 − 0.11 − swH − displayH − jacksH − 0.018 − 0.02 (the 0.02 is the gap reserved above the jack block).
6. Overflow: if knobsH / weightedRows < 0.12, do not shrink rows below 0.12 — instead let the panel-node container shrink the art: .knob { width: min(32px, 58cqh) } and the label truncates. The layout never emits rows taller than the band; the clamp in computePanel stays.
7. Switch rows: row h = 0.075 (34px); switch cols = min(cols, 2) for hp < 10, cols otherwise. A switch with > 3 options spans the full row (spanRow = options.length > 3). Switch block sits directly below the knob block.
8. Display block: h = 0.20 (91px) for hp ≥ 6; 0.16 (73px) for hp ≤ 4; full usable width; placed below switches, with 0.01 gap above.
9. Jack columns: jackCols = clamp(floor(usablePx / 43), 1, 8) → 2 HP:1, 4 HP:2, 6 HP:3, 8 HP:4, 10 HP:5, 12 HP:6, 16 HP:8. Jack row h = 0.10 (66px = 37 socket + 4 gap + 12 label + slack); a label too long for its column wraps to a second line instead of ellipsising.
10. Jack block is pinned to the bottom: jackBottom = 1 − 0.018; outputs occupy the last ceil(outs/jackCols) rows, inputs the ceil(ins/jackCols) rows immediately above; jackTop = jackBottom − jacksH. Leftover vertical space is absorbed between the content block and the jack block (rule 5), never below the outputs.
11. Output strip: the output rows get a full-width recessed band behind them (CSS on .module-panel::after positioned with --out-top set by the layout? no — keep CSS-only: the output cell's label pill and second ring already mark outputs; no band). Inputs: label above socket; outputs: label below socket (existing column-reverse).
12. Label placement: knob label below knob (3px gap), switch label above trough (2px), LED label below bead (3px), jack labels per rule 11. All labels centred, single line, ellipsis.
13. 2 HP special-case (width 52px): rules 1/3/9 give 1 col, 1 jack col; header uses the container-query size (11.5px name, sub hidden below 85px); big knob art is capped at min(64px, 68cqw) → 33px so the ring stays inside the panel; jack labels at 10px.
14. 16 HP (416px): 4 knob cols of 91.5px, 8 jack cols of 45.8px; display block 366×132px.
15. Selected panel: 1px border var(--cat) plus box-shadow 0 0 0 1px color-mix(in srgb, var(--cat) 40%, transparent) — replaces the --focus border. Dragging: opacity 0.35 (unchanged).

## 6. Rack chrome

- Page/app bg: --bg #0a0a0b. Topbar: background var(--rail), border-bottom 1px solid #000, box-shadow 0 1px 0 rgba(255,255,255,.05); brand per typography. Live region: --bg, --amber mono 600 10px.
- Rails (CSS only, no markup): .rack-row { padding: 12px 0; background: linear-gradient(180deg, #2a2c31 0, #202126 11px, #000 11px 12px, transparent 12px calc(100% - 12px), #000 calc(100% - 12px) calc(100% - 11px), #202126 calc(100% - 11px), #2a2c31 100%); } plus a brushed texture layer on top: repeating-linear-gradient(90deg, rgba(255,255,255,.035) 0 1px, transparent 1px 3px) masked to the two 12px strips via the same stop positions (second background-image with background-size 100% 12px, background-repeat repeat-x, background-position top and bottom listed twice). Row gap 2px between modules stays; empty rail shows through as the brushed strip.
- Row header (.row-head): mono 500 10px tracked uppercase --text-dim, padding 2px 0 4px. HP bar (.row-bar): 160×3px, background var(--metal-2), border 1px solid #000, radius 0; fill (.row-bar > i) rgba(255,255,255,.7); .over fill var(--danger); .row-hp.over colour var(--danger).
- Module faceplate (.module-panel): width hp*18px, height 455px, background var(--grain) over var(--panel) (background-blend-mode: normal; the SVG carries its own alpha), plus a top-lit sheen linear-gradient(180deg, rgba(255,255,255,.04), transparent 30%); border 1px solid #000; border-top none (no coloured top bar); border-radius 2px; box-shadow inset 0 1px 0 rgba(255,255,255,.06), inset 0 0 0 1px rgba(255,255,255,.02), 0 6px 14px rgba(0,0,0,.6). .dark: background var(--grain) over var(--panel-dark). container-type: inline-size on .module-panel (keeps contain: layout paint).
- Header (.module-head): transparent background, padding 13px 4px 0, text-align centre, cursor grab; ::after = the 1px accent hairline at the band bottom (rule 2). .panel-x: 14px, colour --text-dim, hover --danger, no background.
- Faceplate image override (useFaceplateImage): unchanged — backgroundSize 100% 100% still wins over the CSS background.
- Modals/browser: background --bg-2, border 1px solid --border-soft, radius --r-lg; .browser-item border-left 2px solid var(--cat) (was 4px); .cat-chip border 1px var(--cat), .on: background transparent, colour var(--cat), box-shadow inset 0 -2px 0 var(--cat) (same lit-legend idiom as switches).
- Patch tip: --bg-2 bg, 1px border color-mix(--amber 30%, #000), --amber mono 600 10px.
- Focus ring everywhere: --focus-ring (2px bg gap + 2px #9ad5ff) on :focus-visible only; the module panel itself gets outline 2px solid var(--focus) offset -2px on :focus-visible.
- Reduced motion (@media prefers-reduced-motion: reduce): .knob-cap transition none; .led transition none; .jack.hot animation none (static 2px ring + 12px glow remains); .mpk transition none; no other motion exists.

## 7. Markup changes required

1. src/ui/atoms/led.tsx — change the default colour so LEDs take the category accent: `'--led-c': color ?? 'var(--cat, var(--led))'` (one string).
2. src/core/types.ts — HP_PX = 18, PANEL_H = 455; replace CAT_COLOR values with the --cat-* hexes in tokens (12 strings).
3. src/modules/panel-layout.ts — constants/rules per layoutRules: HEADER_H 0.09 (+0.02 gap), JACK_ROW_H 0.10, SW_ROW_H 0.075, DISPLAY_H 0.20 (0.16 for hp ≤ 4), PAD_X 0.03/0.06 by hp, cols = clamp(floor(usablePx/46),1,4), jackCols = clamp(floor(usablePx/30),1,8), bottom-pinned jack block with the leftover gap placed above it, big-row weight 1.27. No node-shape or id changes.
4. src/ui/molecules/cable-canvas.tsx — SAG 14, WIDTH 3, sag factor 0.16, the four-pass stroke order and plug-end drawing in `rope`, per-kind dash on the highlight pass. No DOM change.
No other atom/organism markup changes. Knob knurl, jack nut, hex screw, switch trough, rails, grain and the header hairline are all pseudo-elements or background layers on existing classes.

## 8. Risks

- Grain data URI + 40 panels: the SVG filter rasterises once per tile size per panel; keep the tile at 120×120 and do not animate it. If Safari shows banding on the 7% alpha, drop to numOctaves 1.
- repeating-conic-gradient knurl at 32px can shimmer on fractional DPR; the 1px #050506 outer ring hides most of it. If it aliases badly on 1× displays, widen the knurl period to 9deg.
- HP 15→18 widens every row by 20%; a 3U row of 84 HP goes from 1260 to 1512px, so the rack-scroll horizontal overflow kicks in earlier on laptops. Authored `<id>.panel.ts` layouts are normalised (0..1) so they survive, but any pixel-tuned faceplate images from useFaceplateImage will be stretched to the new box.
- Jack kind ring is the only colour on the socket and it is 1.5px — the dashed/dotted/double styles plus glyph carry CVD distinguishability; do not thin it further. The double style needs border-width 3px, which makes gate jacks visually 3px heavier — accepted.
- --led-c default now inherits --cat; the LED atom is used inside displays where --cat is always set by the panel, but the module browser preview (builder-preview.tsx) must also set --cat or LEDs there fall back to --led.
- LED and lit-switch accent colours are never used as body text at sizes below 7.5px, and all accents pass 4.5:1 on --panel, but --cat-output #e5e7eb glows are near-white: OUTPUT modules will read as monochrome by design.
- Container query on .module-panel (container-type: inline-size) coexists with contain: layout paint; if a browser refuses the combination, replace the query with an `hp-narrow` class set by module-panel.tsx when hp ≤ 3.
- The cable highlight-pass dash patterns reset per stroke; call ctx.setLineDash([]) after each cable or the plug-end arcs will inherit the dash.
