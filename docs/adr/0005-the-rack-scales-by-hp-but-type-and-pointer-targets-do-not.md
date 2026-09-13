# The rack scales by `--hp`, but type and pointer targets do not

Panel geometry was already normalised — `layoutPanel` emits 0..1 fractions and `--hp` / `--panel-h`
are published on `:root` from TypeScript at boot. The hardware art was not: around 211 literal pixel
values across the stylesheets drew a 37px jack, a 46px knob, an 11px screw and a 19px fader cap at
one fixed size, so the rack was half-scalable and looked it. The art now derives from
`--u: calc(var(--hp) / HP_PX)`, which makes `--hp` the single number the whole instrument scales by:
setting it is the entire zoom feature, and the layout memo does not even need dropping, because
`layoutPanel` computes against base units and caches fractions that are the same at any scale.

Three things deliberately stay in pixels. The `>=44px` invisible pointer targets are an accessibility
floor rather than art — they must not shrink when someone zooms out, and when the rack grows the
control's own box has already overtaken them. One-pixel hairlines and the jack's 2px/4px ring widths
carry Signal Kind as line-style, which is the redundancy channel that makes the palette work for
colour-blind users; a scaled hairline stops reading as a line. And type stays fixed, which is why the
pixel corrections inside container-query expressions stay pixels too: they offset a gap that is also
fixed, and half-converting the pair would be worse than converting neither.

`PANEL_H` is untouched, so the 5.08 : 128.5 Eurorack ratio survives and panel height follows `--hp`
rather than pinning the rack half-scaled. Making panel height track the viewport instead was rejected:
`PanelNode` fractions assume a fixed aspect, so it would distort every panel rather than resize it.

## Consequences

A `@container` condition cannot read a custom property, so the four panel-width breakpoints — the
two-screw rule and the three type steps — are the one thing `--hp` does not carry. At a non-default
`--hp` a 4 HP panel keeps four screws. The escape is a style query on the HP count, which would also
make that rule say "4 HP" literally instead of arriving there by arithmetic; until zoom actually
ships, the breakpoints are correct at the shipping scale and the divergence is invisible.

Because type does not scale, a large `--hp` reads small-lettered, and the layout's legend-width
estimates become conservative rather than wrong. Making the layout re-decide at the new scale is a
different change — feeding live HP pixels into `layoutPanel` — and should not be mistaken for a
follow-up to this one.

Anyone adding hardware art should reach for `--u`. Anyone adding a touch target, a hairline, or text
should not, and the contract block at the top of `controls.css` says which is which.
