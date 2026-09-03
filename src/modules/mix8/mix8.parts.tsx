import type { ReactNode } from 'react';
import '../../styles/mix8.css';
import { setParam } from '../../engine/rack';
import type { ModuleInstance } from '../../engine/types';
import { useSwitch, useWorkletFeed } from '../../hooks/module-api';
import { selectModuleRevision, useRackStore } from '../../state/rack-store';
import { Knob } from '../../ui/atoms/knob';
import { EQ_KNOBS } from './mix8.def';
import { biquad, magDb, NB, NCH } from './mix8.eq';

const PTS = 56;
const FREQ = Array.from({ length: PTS }, (_, i) => 20 * Math.pow(1000, i / (PTS - 1)));

/** Summed response of the selected channel's four bands, in a 100x60 viewBox at 1.5px/dB. */
function curvePath(m: ModuleInstance): string {
  const sr = m.node?.context.sampleRate ?? 48000;
  const co = new Float64Array(NB * 5);
  for (let b = 0; b < NB; b++) {
    biquad(
      b,
      m.vals[`eq${b + 1}f`] ?? 1000,
      m.vals[`eq${b + 1}g`] ?? 0,
      m.vals[`eq${b + 1}q`] ?? 0.9,
      sr,
      co,
      b * 5,
    );
  }
  return FREQ.map((f, i) => {
    let db = 0;
    for (let b = 0; b < NB; b++) db += magDb(co, b * 5, f, sr);
    const y = 30 - Math.max(-20, Math.min(20, db)) * 1.5;
    return `${i ? 'L' : 'M'}${((i / (PTS - 1)) * 100).toFixed(2)} ${y.toFixed(2)}`;
  }).join(' ');
}

/** Channel-strip EQ: one visible set of 12 knobs edits whichever channel SEL points at.
    The DSP holds all 8 EQ states and answers a SEL change with `{t:'eqdump'}`, which
    re-seeds the knobs — so they stay ordinary params and automation still works. */
export function Mix8Parts({ m }: { m: ModuleInstance }): ReactNode {
  useRackStore(selectModuleRevision(m.uid));
  const [sel, setSel] = useSwitch(m, 'sel');

  useWorkletFeed<{ t?: string; v?: number[] }>(m, (msg) => {
    if (msg.t !== 'eqdump' || !Array.isArray(msg.v)) return;
    msg.v.forEach((v, i) => {
      const k = EQ_KNOBS[i];
      if (k && Number.isFinite(v)) setParam(m.uid, k.id, v);
    });
  });

  return (
    <div className="mix8-eq">
      <div className="mix8-col">
        <div className="mix8-sel">
          <span className="mix8-cap">EQ CH</span>
          {Array.from({ length: NCH }, (_, i) => (
            <button
              key={i}
              type="button"
              className={'btn' + (sel === i ? ' on' : '')}
              aria-pressed={sel === i}
              aria-label={`Edit EQ of channel ${i + 1}`}
              onClick={() => setSel(i)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="mix8-bands">
          {EQ_KNOBS.map((k) => (
            <Knob key={k.id} m={m} def={k} />
          ))}
        </div>
      </div>
      <div className="scope-screen mix8-curve">
        <svg
          viewBox="0 0 100 60"
          preserveAspectRatio="none"
          role="img"
          aria-label={`EQ curve, channel ${sel + 1}`}
        >
          <line x1="0" y1="30" x2="100" y2="30" />
          <path d={curvePath(m)} />
        </svg>
      </div>
    </div>
  );
}

export const parts = Mix8Parts;
