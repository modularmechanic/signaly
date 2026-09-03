import { describe, expect, it } from 'vitest';
import { getSpec } from '../src/modules/registry';
import { EXAMPLES } from '../src/patches/examples';
import { isRackSnapshot } from '../src/engine/snapshot';

/** Every bundled example must load cleanly: known modules only, every knob, switch and jack
    named in the file exists on its module, every ext blob passes its module's validator, and
    every module sits in exactly one row. A patch that fails here would load with silently
    dropped cables — the worst kind of broken showcase. */
describe('example patches', () => {
  it('ships five examples', () => {
    expect(EXAMPLES).toHaveLength(5);
  });

  it.each(EXAMPLES.map((e) => [e.name, e] as const))('%s is consistent with the registry', (_name, ex) => {
    expect(isRackSnapshot(ex.snapshot)).toBe(true);
    const { modules, cables, rows } = ex.snapshot;
    const byUid = new Map(modules.map((m) => [m.uid, m]));
    expect(byUid.size).toBe(modules.length);

    for (const m of modules) {
      const spec = getSpec(m.mtype);
      expect(spec, `unknown module ${m.mtype}`).toBeDefined();
      const def = spec!.def;
      const knobs = new Set(def.knobs.map((k) => k.id));
      const sws = new Set((def.sws ?? []).map((s) => s.id));
      for (const [id, v] of Object.entries(m.vals)) {
        expect(knobs.has(id), `${m.mtype}#${m.uid} has no knob ${id}`).toBe(true);
        const k = def.knobs.find((x) => x.id === id)!;
        expect(v, `${m.mtype}#${m.uid} ${id}=${v} outside ${k.min}..${k.max}`).toBeGreaterThanOrEqual(k.min);
        expect(v).toBeLessThanOrEqual(k.max);
      }
      for (const [id, i] of Object.entries(m.sws)) {
        expect(sws.has(id), `${m.mtype}#${m.uid} has no switch ${id}`).toBe(true);
        const top = def.sws!.find((x) => x.id === id)!.options.length;
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i, `${m.mtype}#${m.uid} switch ${id}=${i} beyond ${top} options`).toBeLessThanOrEqual(
          Math.max(1, top - 1),
        );
      }
      if (m.ext !== undefined) {
        expect(spec!.serialize, `${m.mtype} carries ext but has no serializer`).toBeDefined();
        expect(spec!.serialize!.validate(m.ext), `${m.mtype}#${m.uid} ext rejected`).toBe(true);
      }
    }

    const inUse = new Set<string>();
    for (const c of cables) {
      const from = byUid.get(c.from.uid);
      const to = byUid.get(c.to.uid);
      expect(from, `cable ${c.id} from unknown uid ${c.from.uid}`).toBeDefined();
      expect(to, `cable ${c.id} to unknown uid ${c.to.uid}`).toBeDefined();
      const outs = getSpec(from!.mtype)!.def.outs.map((j) => j.id);
      const ins = getSpec(to!.mtype)!.def.ins.map((j) => j.id);
      expect(outs, `${from!.mtype}#${from!.uid} has no out ${c.from.jack}`).toContain(c.from.jack);
      expect(ins, `${to!.mtype}#${to!.uid} has no in ${c.to.jack}`).toContain(c.to.jack);
      const key = `${c.to.uid}:${c.to.jack}`;
      expect(inUse.has(key), `input ${to!.mtype}#${key} patched twice`).toBe(false);
      inUse.add(key);
    }

    const placed = rows.flat();
    expect(new Set(placed).size).toBe(placed.length);
    expect(new Set(placed)).toEqual(new Set(byUid.keys()));
    expect(modules.some((m) => m.mtype === 'out')).toBe(true);
  });
});
