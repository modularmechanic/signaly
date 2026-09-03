import type { Cat, KnobDef, ModuleDef, SwitchDef } from './types';

/* The visual identity system. A rack should read as kit bought from twenty different makers,
   so a module names one `kit` and the kit resolves to seven independent style axes. Each axis
   is a data attribute in the DOM and one small CSS block, so twenty identities cost twenty
   rows in the table below, not twenty stylesheets. */

/** Faceplate material and colour. One block per value in styles/faceplates.css. */
export type Finish =
  'alu' | 'cream' | 'graph' | 'black' | 'pcb' | 'ano' | 'copper' | 'slate' | 'carbon' | 'white';
/** Knob hardware: machined knurl, skirted Davies, chicken-head, D-shaft trimmer, soft rubber. */
export type KnobLook = 'knurl' | 'davies' | 'chicken' | 'trimmer' | 'rubber';
/** Switch hardware: backlit legend trough, bat lever, slide cap. */
export type SwitchLook = 'tab' | 'toggle' | 'slide';
/** How the maker treats the name plate. */
export type HeadLook = 'rule' | 'band' | 'box' | 'bar' | 'stamp' | 'plain';
/** Silkscreen printed on the bare plate, in the finish's own ink. */
export type SilkLook = 'none' | 'grid' | 'dots' | 'bars' | 'chevron' | 'curve' | 'ring';
/** Legend typography. */
export type TypeLook = 'mono' | 'grotesk' | 'stencil';
/** Socket body. The kind ring — colour, line style, glyph — is never a style axis. */
export type JackLook = 'nut' | 'plain' | 'ringed';

export interface KitSpec {
  plate: Finish;
  knob: KnobLook;
  sw: SwitchLook;
  head: HeadLook;
  silk: SilkLook;
  type: TypeLook;
  jack: JackLook;
}

export type Kit =
  | 'analog'
  | 'atelier'
  | 'console'
  | 'noir'
  | 'board'
  | 'anodic'
  | 'bronze'
  | 'slateware'
  | 'carbon'
  | 'chalk'
  | 'lab'
  | 'tape'
  | 'stage'
  | 'voice'
  | 'signal'
  | 'ether'
  | 'grid'
  | 'patina'
  | 'arc'
  | 'press';

/** One row per maker, columns in KitSpec order: plate, knob, sw, head, silk, type, jack.
    Tuples, not objects, so the table still reads as a table — as objects each row is 9 lines. */
type Row = [Finish, KnobLook, SwitchLook, HeadLook, SilkLook, TypeLook, JackLook];

const ROWS: Record<Kit, Row> = {
  analog: ['alu', 'davies', 'toggle', 'rule', 'none', 'mono', 'nut'],
  atelier: ['cream', 'chicken', 'toggle', 'box', 'curve', 'grotesk', 'plain'],
  console: ['graph', 'knurl', 'slide', 'band', 'bars', 'stencil', 'nut'],
  noir: ['black', 'rubber', 'tab', 'rule', 'none', 'grotesk', 'plain'],
  board: ['pcb', 'davies', 'slide', 'stamp', 'grid', 'stencil', 'plain'],
  anodic: ['ano', 'knurl', 'tab', 'rule', 'ring', 'mono', 'nut'],
  bronze: ['copper', 'davies', 'toggle', 'bar', 'chevron', 'mono', 'nut'],
  slateware: ['slate', 'knurl', 'slide', 'band', 'dots', 'grotesk', 'nut'],
  carbon: ['carbon', 'rubber', 'slide', 'plain', 'chevron', 'grotesk', 'ringed'],
  chalk: ['white', 'chicken', 'toggle', 'bar', 'curve', 'grotesk', 'plain'],
  lab: ['alu', 'trimmer', 'tab', 'box', 'grid', 'stencil', 'ringed'],
  tape: ['cream', 'knurl', 'slide', 'band', 'ring', 'mono', 'nut'],
  stage: ['black', 'chicken', 'toggle', 'band', 'bars', 'stencil', 'nut'],
  voice: ['graph', 'davies', 'toggle', 'box', 'curve', 'mono', 'plain'],
  signal: ['slate', 'trimmer', 'tab', 'rule', 'chevron', 'mono', 'ringed'],
  ether: ['ano', 'rubber', 'slide', 'plain', 'ring', 'grotesk', 'plain'],
  grid: ['pcb', 'knurl', 'tab', 'band', 'grid', 'mono', 'ringed'],
  patina: ['copper', 'chicken', 'tab', 'stamp', 'dots', 'grotesk', 'plain'],
  arc: ['white', 'knurl', 'slide', 'rule', 'chevron', 'mono', 'nut'],
  press: ['carbon', 'davies', 'tab', 'box', 'bars', 'stencil', 'plain'],
};

export const KITS = Object.fromEntries(
  Object.entries(ROWS).map(([kit, [plate, knob, sw, head, silk, type, jack]]) => [
    kit,
    { plate, knob, sw, head, silk, type, jack },
  ]),
) as Record<Kit, KitSpec>;

/** Only reached by a module with no `look` of its own — user-authored modules, in practice. */
export const CAT_KIT: Record<Cat, Kit> = {
  SOURCES: 'analog',
  FILTERS: 'anodic',
  'ENV / FUNC': 'chalk',
  'AMP / MIX': 'slateware',
  FX: 'noir',
  VOICES: 'voice',
  'SEQ / CTRL': 'board',
  DRUMS: 'stage',
  METERS: 'press',
  OUTPUT: 'console',
  UTILITY: 'signal',
  CUSTOM: 'carbon',
};

export const kitOf = (def: ModuleDef): KitSpec =>
  KITS[def.look ?? CAT_KIT[def.cat] ?? CAT_KIT.CUSTOM] ?? KITS.noir;

/** A single control may override its kit's hardware — a trimmer among Davies knobs. */
export const knobLookOf = (def: ModuleDef, k?: KnobDef): KnobLook => k?.look ?? kitOf(def).knob;

export const switchLookOf = (def: ModuleDef, s?: SwitchDef): SwitchLook => s?.look ?? kitOf(def).sw;
