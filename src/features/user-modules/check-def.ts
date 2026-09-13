import { FMT_RANGE, type PanelNode } from '../../core/types';
import { whyNotReady } from '../../modules/display-contract';
import { fitPanel, MIN_CONTROL_PX, PANEL_H } from '../../modules/panel-layout';
import { MIN_ROW_HP } from '../../state/settings-store';
import type { UserDef } from './schema';
import { bad } from './validate-primitives';

// `UserDef` is `ModuleDef` minus the runtime-owned fields, so a built-in spec passes here too.
type Def = UserDef;

const NODE_KIND: readonly string[] = ['knob', 'fader', 'switch', 'led', 'in', 'out', 'display', 'label'];
const FREE_PREFIX: readonly string[] = ['label', 'display'];
const LED_ID = /^[a-z0-9_-]+$/;
const EPS = 1e-9;

function dupes(ids: readonly string[], say: (id: string) => string): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) bad(say(id));
    seen.add(id);
  }
}

function checkKnobs(def: Def, saved: boolean): void {
  const ins = new Set(def.ins.map((j) => j.id));
  const cvIns = new Set(def.ins.filter((j) => j.kind === 'c').map((j) => j.id));
  const att1 = new Set<string>();
  def.knobs.forEach((k, i) => {
    const at = `knobs[${i}]`;
    if (k.min >= k.max) bad(`${at}.min must be less than ${at}.max`);
    if (k.initial < k.min || k.initial > k.max) bad(`${at}.initial must be within [${k.min}, ${k.max}]`);
    if (k.cvIn !== undefined && !ins.has(k.cvIn)) bad(`${at}.cvIn "${k.cvIn}" names no input jack`);
    // Last, so a knob that breaks a stronger rule still reports that rule. fmt itself is required
    // by the type; what needs checking is that the range suits the unit it declares.
    const range = saved ? undefined : FMT_RANGE[k.fmt];
    if (range && (k.min < range[0] || k.max > range[1]))
      bad(`${at} is fmt '${k.fmt}', so [${at}.min, ${at}.max] must stay within [${range[0]}, ${range[1]}]`);
    if (k.attenuates === undefined) return;
    if (!cvIns.has(k.attenuates)) bad(`${at}.attenuates "${k.attenuates}" must name a 'c' input`);
    // Two gains on one jack would leave the second unwired; one attenuator per input.
    if (att1.has(k.attenuates))
      bad(`${at}.attenuates "${k.attenuates}" is already attenuated by another knob`);
    att1.add(k.attenuates);
  });
}

function checkPanel(def: Def, nodes: readonly PanelNode[], saved: boolean): void {
  const knobIds = new Set(def.knobs.map((k) => k.id));
  const targets: Record<string, Set<string> | undefined> = {
    knob: knobIds,
    fader: knobIds,
    switch: new Set((def.sws ?? []).map((s) => s.id)),
    led: new Set(def.leds ?? []),
    in: new Set(def.ins.map((j) => j.id)),
    out: new Set(def.outs.map((j) => j.id)),
  };
  dupes(
    nodes.map((n) => n.id),
    (id) => `panel.nodes has a duplicate id "${id}"`,
  );
  nodes.forEach((n, i) => {
    const at = `panel.nodes[${i}]`;
    const sep = n.id.indexOf(':');
    const prefix = sep < 0 ? n.id : n.id.slice(0, sep);
    const need = targets[prefix];
    if (need) {
      if (!need.has(sep < 0 ? '' : n.id.slice(sep + 1))) bad(`${at}.id "${n.id}" names no ${prefix}`);
    } else if (!FREE_PREFIX.includes(prefix)) {
      bad(`${at}.id "${n.id}" has an unknown prefix`);
    }
    if (!NODE_KIND.includes(n.kind)) bad(`${at}.kind must be one of: ${NODE_KIND.join(', ')}`);
    for (const [k, v] of [
      ['x', n.x],
      ['y', n.y],
      ['w', n.w],
      ['h', n.h],
    ] as const) {
      if (!Number.isFinite(v) || v < 0 || v > 1) bad(`${at}.${k} must be within 0..1`);
    }
    if (n.x + n.w > 1 + EPS) bad(`${at} overflows the panel horizontally`);
    if (n.y + n.h > 1 + EPS) bad(`${at} overflows the panel vertically`);
    // Authored geometry skips the computed layout, so it is held to the same control minimums.
    if (!saved && n.kind === 'fader' && n.h * PANEL_H < MIN_CONTROL_PX.fader - EPS)
      bad(`${at} is too short for a fader — it needs at least ${MIN_CONTROL_PX.fader}px of the panel`);
  });
}

function rules(def: Def, saved: boolean): void {
  if (!Number.isInteger(def.hp) || def.hp < 1 || def.hp > MIN_ROW_HP)
    bad(
      `def.hp must be an integer from 1 to ${MIN_ROW_HP}: a module has to fit the narrowest row a rack can be set to (${MIN_ROW_HP} HP), or it could never be placed`,
    );
  dupes(
    def.ins.map((j) => j.id),
    (id) => `ins has a duplicate jack id "${id}"`,
  );
  dupes(
    def.outs.map((j) => j.id),
    (id) => `outs has a duplicate jack id "${id}"`,
  );
  checkKnobs(def, saved);
  const knobIds = def.knobs.map((k) => k.id);
  const swIds = (def.sws ?? []).map((s) => s.id);
  if (saved) {
    dupes(knobIds, (id) => `knobs has a duplicate id "${id}"`);
    dupes(swIds, (id) => `sws has a duplicate id "${id}"`);
  } else {
    // One namespace, not two: makeNode writes knobs and switches into ONE param bag, switches
    // last, so a knob and a switch sharing an id ships a worklet whose `this.p.<id>` is the
    // switch index while the panel shows the knob.
    dupes(
      [...knobIds, ...swIds],
      (id) => `"${id}" is a duplicate id — knobs and switches share one param namespace`,
    );
  }
  (def.sws ?? []).forEach((s, i) => {
    // One option is a lit push-button toggle (a console's M, S and PRE), so one is the floor.
    if (s.options.length < 1) bad(`sws[${i}].options needs at least 1 entry`);
    if (
      s.initial !== undefined &&
      (!Number.isInteger(s.initial) || s.initial < 0 || s.initial >= s.options.length)
    )
      bad(`sws[${i}].initial must index options`);
  });
  const leds = def.leds ?? [];
  const litSeen = new Set<string>();
  leds.forEach((id, i) => {
    if (!LED_ID.test(id) || litSeen.has(id)) bad(`leds[${i}] must be a unique [a-z0-9_-] id`);
    litSeen.add(id);
  });
  // A declared display that can never draw is a blank screen and no error — see display-contract.
  // Not held against saved work: the live panel already shows a placeholder for it.
  const why = saved ? null : whyNotReady(def, null);
  if (why !== null) bad(`def.display '${def.display}': ${why}`);
  // Authored geometry replaces the computed layout wholesale, so only one of the two is checked.
  if (def.panel) {
    checkPanel(def, def.panel.nodes, saved);
    return;
  }
  // computePanel clamps whatever it is given, so saved work lays out; only new work must fit.
  if (saved) return;
  const fit = fitPanel(def, MIN_ROW_HP);
  if (fit.fits) return;
  bad(
    fit.hp === null
      ? `this module lays out at no panel width — use fewer jacks or controls`
      : `def.hp ${def.hp} is too narrow to lay this module out — use at least ${fit.hp} HP`,
  );
}

/** The single answer to "is this ModuleDef well-formed" — `null`, or the first failure.
    Its two call sites are validateUserDef (untrusted JSON, after shape parsing) and the
    built-in sweep test. Input bounds that only make sense for untrusted data — string
    lengths, list caps — stay with the parser.

    `saved` reads back work that already exists: a stored user module, or an exported one being
    imported. It holds that work to the rules it was saved under and skips the ones added since —
    fmt ranges, the shared knob/switch namespace, the fader minimum, the display contract and the
    layout fit. None of those guards against a crash; they guard the quality of new work, and
    enforcing them on old work would silently delete modules that loaded and played before. New
    definitions, and any saved module the moment it is edited and saved again, meet all of them. */
export function checkDef(def: Def, saved = false): string | null {
  try {
    rules(def, saved);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : 'invalid module definition';
  }
}
