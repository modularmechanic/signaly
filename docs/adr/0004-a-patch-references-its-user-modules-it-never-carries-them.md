# A Patch references its User Modules, it never carries them

A Patch stores `mtype: 'user:<slug>'` and nothing else: a bare reference to a module that must
already be registered. The obvious alternative is to embed each referenced User Module's Definition
and DSP source in the Patch, which would make a Patch self-contained — portable between browsers, and
carrying enough information to draw a placeholder for a module the reader does not have. It was
rejected.

The first reason is that it smuggles in a feature the project deliberately excludes. The README lists
public module sharing under *Deliberately absent*, and the moment a Patch carries executable DSP,
importing a Patch means running a stranger's code. The Patch importer would inherit the whole
User Module threat model — transpile, forbidden-global scan, offline verification — for a file format
whose entire present job is to name modules and remember where the Cables went.

The second is duplication with no story for which copy wins. A module embedded in five Patches is
five copies; edit the module and every copy is stale. Nothing in the format could say whether loading
a Patch should overwrite the installed module, ignore the copy, or fork it, and every answer is wrong
for some user.

If Patch portability becomes a real want, the honest shape is an exported bundle — the Patch together
with its User Modules as separate, separately validated records — not DSP inlined into the Patch
format.

## Consequences

Loading a Patch that names an absent module cannot restore that module, and no amount of care in the
loader will change that; the Patch does not contain the information. The loader therefore reports
what was missing rather than pretending. Cables attached to an absent module are still lost, because
a Cable needs Jacks to hang from and the Jack list lived in the Definition that was never stored.

Drawing a placeholder module to preserve those Cables is the natural upgrade, and it is blocked on
exactly this decision: it needs a Jack list the Patch does not carry. Anyone reaching for it should
reopen this ADR rather than quietly adding a `defs` field to the Patch format.
