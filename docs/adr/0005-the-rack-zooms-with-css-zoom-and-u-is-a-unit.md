# The rack zooms with CSS zoom, and `--u` is a unit rather than a zoom

The hardware art used to be drawn at fixed pixel sizes — a 37px jack, a 46px knob, an 11px screw, a
19px fader cap — scattered across the stylesheets as literals. It now derives from
`--u: calc(var(--hp) / HP_PX)`, published once from `main.tsx`, so every piece of hardware scales
from one number and no stylesheet restates a size that TypeScript also knows.

That unit was first designed as the zoom itself: set `--hp` and the whole instrument would resize.
It is not the zoom, because the rack already had one. `.rack` zooms with CSS `zoom: var(--rack-zoom)`
over a range of 0.2 to 1000, driven by pinch, ctrl+wheel, the zoom dock and a remembered level, and
the zoom-aware cable geometry and the rect correction under CSS zoom are both built on it. CSS zoom
also has a property `--hp` scaling could never have: container queries still measure unzoomed widths,
so the panel breakpoints — two screws on a narrow panel, the type steps — keep meaning what they say
at every zoom level. Scaling by `--hp` would have re-targeted all four of them the moment the user
zoomed.

So there is exactly one scaling mechanism. `--hp` is set at boot and never changes at runtime, which
makes `--u` always one pixel. It stays as a unit anyway, because the base size of the hardware is
still a real design parameter and the unit is what lets it change in one place.

Three things are deliberately not expressed in `--u`. The `>=44px` invisible pointer targets are an
accessibility floor rather than art. One-pixel hairlines and the jack's 2px/4px ring widths carry
Signal Kind as line style, the redundancy channel that makes the palette work for colour-blind users,
and a scaled hairline stops reading as a line. And type stays fixed, which is why the pixel
corrections inside container-query expressions stay pixels too: they offset a gap that is also fixed.

## Consequences

Under CSS zoom, `getBoundingClientRect` reports zoomed rectangles while layout works in unzoomed
ones. Anything that turns a pointer position or an element's rect into rack coordinates has to
correct for that, and `cable-overlay.ts` is where that correction lives. New code that measures
elements inside the rack should go through it rather than measuring again.

CSS zoom scales everything inside the rack, including the pointer targets that are kept out of `--u`.
Those targets therefore shrink when the user zooms out; what that means for touch is recorded in
ADR-0006.

If the base hardware size ever needs to change, change `HP_PX` and the art follows. Do not reach for
`--hp` to implement zoom a second time.
