# Touch devices get bigger targets, not bigger hardware

Two stylesheets grew the art under `@media (pointer: coarse)`: the jack socket from 37px to 46px and
the fader from 20px to 26px. Both are laid out by `panel-layout.ts`, which packs jack columns and
fader columns against fixed pixel widths — and those widths were the un-grown ones. So on a touch
device the layout packed columns three pixels narrower than the art it was packing, and the fader
column was fourteen pixels short. The mismatch was invisible on a desktop and wrong on every phone.

Reconciling it meant one of two bad trades. Packing every panel to the touch-sized socket would cost
a jack column on an 8 HP panel for desktop users who never benefit, and some panels would stop
fitting at all. Teaching the layout to read `matchMedia` would make panel geometry depend on input
device, with a cache to invalidate whenever that changes — a moving target underneath a module system
whose whole appeal is that a definition lays out deterministically.

So the coarse-pointer art growth is gone, and the two widths now have one owner: `panel-layout.ts`
exports them and `main.tsx` publishes each as a `--u`-scaled custom property that the stylesheets
draw from, so a future override cannot desynchronise them again. The touch affordance it was reaching
for is unaffected, because it never lived in the art: `cables.css` already carries `>=44px`
pseudo-element pointer targets, and the note above them has always said exactly that — _a 44px touch
target without scaling the socket art_. The coarse block was contradicting its own design note.

The coarse growth for knobs and the `min-height` on switch options and buttons stay. Neither is
coupled to the layout, so neither can drift from it.

## Consequences

Sockets and faders are the same physical size on a phone as on a desktop, which is a real reduction
in visible affordance and was chosen knowingly. The lever for wanting bigger hardware on touch is rack
zoom (ADR-0005), which moves the art and the layout together instead of only one of them.

**The 44px floor holds at the default zoom, not below it.** Rack zoom is CSS `zoom` on the whole rack,
so it shrinks the pointer targets along with everything else: at the minimum zoom of 0.2 a 44px
target covers under nine pixels. Counter-scaling the targets back up by the inverse of the zoom was
considered and rejected, because it cannot work: jack spacing shrinks at exactly the same rate. A
target inflated past the spacing overlaps its neighbour, so a tap lands on the wrong jack, and one
capped at the spacing ends up no larger than it already was. At the default zoom the target is 44px
against a 43px jack pitch — the floor and the spacing already meet there, and no zoom level below it
can have both. Zoomed out is for finding a module; patching happens zoomed in. If touch patching at a
distance ever matters, the fix is to zoom in on the first touch of a jack, not to grow its target.

A guard fails if anyone reintroduces a per-control coarse-pointer resize of `.jack` or `.fader`. That
is deliberate: the next person to notice small sockets on a phone will reach for exactly the rule
that was just removed, and the test is there to tell them where the lever actually is.
