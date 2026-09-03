# Panel geometry is computed by default, authored only by exception

The 40 built-in modules originally shipped hand-placed panel coordinates ported from the app Signaly was rewritten from. Those files were deleted and every panel is now laid out by `layoutPanel(def)` from the module definition, because carrying over the original coordinates made the rework a copy of the thing it replaced.

The mixer then proved the computed layout cannot serve every module: with 18 jacks and 17 knobs, the fixed header, jack and padding bands leave about a third of the panel for knobs, and the four-column cap puts every fader row at roughly 45px where a fader needs 96px. So `ModuleDef.panel` survives as an escape hatch — a built-in may author its own geometry, but only when it can show the computed layout fails, and the computed layout remains the rule for every ordinary module and for all user modules.

## Consequences

A reader finding one module with authored coordinates and forty without should not "fix" the inconsistency. The exception is deliberate and is expected to stay rare; if a second and third module need it, that is evidence the computed layout's rules need widening rather than more exceptions.
