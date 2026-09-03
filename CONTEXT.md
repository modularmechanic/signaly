# Signaly

A browser-based modular synthesizer. The user places modules in a rack, connects them with cables, and hears the result; they can also author new modules themselves.

## Rack and patching

**Patch**:
A named, saved arrangement of modules, their control values, and the cables between them.
_Avoid_: Preset, patch file, saved rack

**Rack Snapshot**:
The serialisable state of the whole rack at one moment. A Patch is a Rack Snapshot plus a name and an identity.
_Avoid_: Patch (when the name and identity matter), state dump

**To patch**:
The user-facing verb for connecting one jack to another. In code the verb is always `connect` / `disconnect`, at every layer.
_Avoid_: wire, hook up

**Cable**:
One connection from an output jack to an input jack. An input holds at most one; an output may feed many.

**Jack**:
A single connection point on a module, either an input or an output, carrying one Signal Kind.

**Row**:
A horizontal strip of the rack holding modules side by side, with a width measured in HP.

**HP**:
The unit of module width, one Eurorack horizontal pitch. A module declares its width in whole HP.

## Signals

**Signal Kind**:
What a jack carries, one of four: **audio**, **pitch** (1V/oct), **gate**, **CV**. These four names are canonical everywhere the user or the language model reads them.
_Avoid_: pitch CV, control CV, gate/trigger, trigger

**Volt**:
The unit every signal is expressed in. Audio swings ±5, gates are 0 or 5, pitch is 1V per octave with 0V at C4.

## Modules

**Module**:
One piece of the instrument, with knobs, switches and jacks. The word alone means the concept; the five terms below name it at a specific point in its life.

**Module Definition**:
The authored, static description of a module — its knobs, switches, jacks, width and category. Persisted inside a Patch by its id.

**Module Instance**:
One live module placed in the rack, holding its own control values and audio nodes.

**Module Spec**:
What the registry stores for a module: its Definition plus any native, serialisation and custom-UI parts.

**Module Proposal**:
The raw, not-yet-validated module a language model returns. Becomes a User Module only after validation.

**User Module**:
A module authored by the user rather than shipped with the app, saved locally and identified by a slug.
_Avoid_: custom module

**Panel**:
The visible face of a module. Its geometry is computed from the Definition by default; a module may author its own only when the computed layout demonstrably fails.

**Faceplate**:
An image placed behind a User Module's panel.
_Avoid_: artwork, panel image

**Display**:
The screen area on a panel — a scope, meter, step grid, envelope, keyboard or text readout.

**Attenuverter**:
A knob that scales and can invert the voltage arriving at a CV input, rather than setting a value of its own.
