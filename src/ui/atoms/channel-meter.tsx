import { useEffect, useRef, type ReactNode } from 'react';
import { addDraw } from '../../hooks/render-bus';

export interface ChannelMeterProps {
  analyser?: AnalyserNode;
  buffer?: Float32Array<ArrayBuffer>;
  label: string;
}

/** Allocation-free DOM VU driven straight off a passive analyser, on the shared render bus. */
export function ChannelMeter({ analyser, buffer, label }: ChannelMeterProps): ReactNode {
  const fill = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!analyser || !buffer) return;
    let held = 0;
    return addDraw(() => {
      analyser.getFloatTimeDomainData(buffer);
      let peak = 0;
      for (let i = 0; i < buffer.length; i++) peak = Math.max(peak, Math.abs(buffer[i] ?? 0));
      // ±5V full scale, with a slow fall-back so the needle reads like a real VU.
      held = Math.max(Math.min(1, peak / 5), held * 0.9);
      if (fill.current) fill.current.style.height = `${Math.max(2, held * 100)}%`;
    });
  }, [analyser, buffer]);
  return (
    <div className="channel-vu" aria-label={`${label} level meter`}>
      <div ref={fill} className="channel-vu-fill" />
    </div>
  );
}
