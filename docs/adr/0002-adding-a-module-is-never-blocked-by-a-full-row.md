# Adding a module is never blocked by a full row

The rack refused `addModule` whenever the destination row had no free HP, and surfaced the refusal as
a message. That made the commonest action in the app — put a module in the rack — fail for a reason
the user had not asked about and could only clear by first tidying a row. Adding a module now always
succeeds: when the row is full, a new row is created directly beneath it and the module lands there.

Dragging a module into a full row still refuses. The two paths look alike but the intent behind them
differs: "add this module" names a module and leaves the placement to the rack, while a drag names a
specific row and drop position, so redirecting it to a row the user did not aim at would put the
module somewhere other than where they pointed. Refusing the drag is the honest answer; spawning a
row for it would not be.

Because a row can now always be grown by adding another, the remaining failure mode was a module too
wide to fit any row at all. The row-width floor therefore rose from 20 HP to 120 HP (range 120–240,
default 120), which is wider than the widest built-in, so no module can ever be unplaceable.

## Consequences

The trade-off recorded here is blocking versus spawning, and it is settled per path rather than
globally: a future placement path has to decide which of the two it is. If the caller chose the row,
refuse; if the rack chose it, spawn.
