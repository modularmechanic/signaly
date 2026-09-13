# Restoring a stored User Module does not re-verify its DSP

Nothing re-registered stored User Modules at startup, so after a reload the Module Browser listed
none of them and a Patch that named one loaded with the module — and every Cable touching it —
silently dropped. `addModule` returns `null` for an unknown Module Spec, `applySnapshot` skips that
module, its uid never reaches the remap table, and every Cable on either end is discarded without a
word. The stored Patch survived only by luck: `savePatch` always mints a fresh id, so re-saving forks
a new Patch rather than overwriting the good one.

The fix is a restore pass at startup, and it raises one real question: the install pipeline verifies
DSP by rendering it in an `OfflineAudioContext` with a 3 s timeout, so does restore verify too?
It does not. Verification exists to catch authoring mistakes — NaN, out-of-range samples, a processor
that never renders — and a module in storage has already passed it, at install or at import. The only
case re-verification catches is a hand-edited `localStorage` payload, and anything able to write that
is already running on this origin, which the threat model in the README concedes is over. Paying one
`OfflineAudioContext` per module on every page load to defend a position already lost is the wrong
trade. Verification stays on the two paths where the code is new to us: install and import.

The restore itself is non-blocking, fired once the worklet bundle resolves. It can afford to be,
because the rack is not persisted — only patches, settings, API keys and user modules have storage
keys — so no Patch loads at boot and nothing races the restore. Blocking the "Loading audio engine…"
gate on it would charge every user a delay bounded only by how many modules they have written, for a
feature most of them never touch.

## Consequences

A module that wedges the audio thread now wedges it at startup rather than at install, and the remedy
is still a reload. That is the accepted cost of not re-verifying.

Because restore is non-blocking, a Patch loaded in the first moments after boot could in principle
race it. Nothing in the app loads a Patch that early — the rack starts empty and seeded — so this is
a constraint on future code rather than a live bug: anything that auto-loads a Patch at startup must
wait on the restore, or the dropped-Cable failure returns in a form that only shows up under timing.

A Patch naming a module that is genuinely absent — deleted, or authored in someone else's browser —
still cannot be reconstituted. It now says so instead of failing quietly.
