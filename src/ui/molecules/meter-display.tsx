import { useRef, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { ChannelMeter } from '../atoms/channel-meter';

interface MeterMsg {
  t: string;
  in?: number;
  gr?: number;
  open?: number;
}

type Buf = Float32Array<ArrayBuffer>;

/** dB (ref 5 V, floor -60) -> 0..1 bar height. */
const dbPct = (db: number): number => Math.max(0, Math.min(1, (db + 60) / 60)) * 100;

/** comp / gate: level + gain-reduction bars painted straight from the worklet feed. */
function FeedMeter({ m }: { m: ModuleInstance }): ReactNode {
  const level = useRef<HTMLDivElement>(null);
  const reduce = useRef<HTMLDivElement>(null);
  useWorkletFeed<MeterMsg>(m, (msg) => {
    if (msg.t !== 'meter') return;
    if (level.current) level.current.style.height = `${dbPct(msg.in ?? -60)}%`;
    // comp reports gain reduction in dB; gate reports its 0..1 opening.
    const gr = msg.gr ?? (msg.open === undefined ? 0 : (1 - msg.open) * 24);
    if (reduce.current) reduce.current.style.height = `${Math.min(100, gr * 4)}%`;
  });
  return (
    <div className="meter-pair">
      <div className="channel-vu" aria-label="input level meter">
        <div ref={level} className="channel-vu-fill" />
      </div>
      <div className="channel-vu gr" aria-label="gain reduction">
        <div ref={reduce} className="channel-vu-fill" />
      </div>
    </div>
  );
}

/** Stereo analyser VUs when the module exposes them, else the worklet meter feed. */
export function MeterDisplay({ m }: { m: ModuleInstance }): ReactNode {
  const l = m.ext.analyserL as AnalyserNode | undefined;
  const r = m.ext.analyserR as AnalyserNode | undefined;
  const bufL = m.ext.bufL as Buf | undefined;
  const bufR = m.ext.bufR as Buf | undefined;
  if (!l || !r) return <FeedMeter m={m} />;
  return (
    <div className="meter-pair">
      <ChannelMeter analyser={l} buffer={bufL} label="left" />
      <ChannelMeter analyser={r} buffer={bufR} label="right" />
    </div>
  );
}
