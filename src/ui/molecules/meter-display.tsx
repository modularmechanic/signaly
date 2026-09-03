import { useRef, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { useCanvas } from '../../hooks/use-canvas';
import { stereoCorrelation } from '../../modules/out/out-analysis';
import type { OutAnalysis } from '../../modules/out/out.native';
import { useRackStore } from '../../state/rack-store';
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

interface Pal {
  hot: string;
  warm: string;
  cool: string;
  dim: string;
  font: string;
}

const readPal = (el: Element): Pal => {
  const cs = getComputedStyle(el);
  const v = (n: string, fallback: string): string => cs.getPropertyValue(n).trim() || fallback;
  return {
    hot: v('--danger', '#ff5d5d'),
    warm: v('--amber', '#f3c77a'),
    cool: v('--cat', v('--kind-c', '#68f3bf')),
    dim: v('--text-dim', '#8d939c'),
    font: v('--font-mono', 'monospace'),
  };
};

const BARS = 40;
/** log-ish bin spacing: bar 0 -> bin 1, bar BARS -> the top bin. */
const binAt = (i: number, n: number): number => Math.min(n - 1, Math.round((n - 1) ** (i / BARS)));

function drawSpectrum(ctx: CanvasRenderingContext2D, w: number, h: number, a: OutAnalysis, p: Pal): void {
  a.l.getFloatFrequencyData(a.spectrumL);
  a.r.getFloatFrequencyData(a.spectrumR);
  const n = a.spectrumL.length;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.hot);
  g.addColorStop(0.35, p.warm);
  g.addColorStop(1, p.cool);
  ctx.fillStyle = g;
  const bw = w / BARS;
  for (let i = 0; i < BARS; i++) {
    const lo = binAt(i, n);
    const hi = Math.max(lo + 1, binAt(i + 1, n));
    let db = -120;
    for (let b = lo; b < hi; b++) db = Math.max(db, a.spectrumL[b] ?? -120, a.spectrumR[b] ?? -120);
    // ±5 V full scale puts a loud bin near +12 dB, so the window is -90..+12.
    const bh = Math.max(1, Math.max(0, Math.min(1, (db + 90) / 102)) * (h - 2));
    ctx.fillRect(i * bw + 0.5, h - bh, Math.max(1, bw - 1), bh);
  }
}

function drawCorrelation(
  ctx: CanvasRenderingContext2D,
  w: number,
  y: number,
  h: number,
  a: OutAnalysis,
  p: Pal,
  withText: boolean,
): void {
  a.l.getFloatTimeDomainData(a.phaseL);
  a.r.getFloatTimeDomainData(a.phaseR);
  const c = stereoCorrelation(a.phaseL, a.phaseR);
  const barH = withText ? 10 : h;
  const top = withText ? y + (h - barH) / 2 - 5 : y;
  const mid = w / 2;
  const x = mid + c * mid;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = p.dim;
  ctx.fillRect(0, top, w, barH);
  ctx.globalAlpha = 1;
  ctx.fillStyle = c < 0 ? p.hot : p.cool;
  ctx.fillRect(Math.min(mid, x), top, Math.max(1, Math.abs(x - mid)), barH);
  ctx.fillStyle = p.warm;
  ctx.fillRect(mid - 0.5, top, 1, barH);
  if (!withText) return;
  ctx.fillStyle = p.dim;
  ctx.font = `600 10px ${p.font}`;
  ctx.textAlign = 'center';
  ctx.fillText(`CORR ${c >= 0 ? '+' : ''}${c.toFixed(2)}`, mid, top + barH + 12);
}

/** Switch-gated spectrum / correlation screen. Per-frame data goes straight to the canvas
    on the shared render bus — never through React state. */
function AnalysisDisplay({
  a,
  spectrum,
  phase,
}: {
  a: OutAnalysis;
  spectrum: boolean;
  phase: boolean;
}): ReactNode {
  const pal = useRef<Pal | null>(null);
  const draw = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
    const p = (pal.current ??= readPal(ctx.canvas));
    ctx.clearRect(0, 0, w, h);
    const strip = phase ? (spectrum ? 9 : h) : 0;
    if (spectrum) drawSpectrum(ctx, w, h - (strip ? strip + 3 : 0), a, p);
    if (phase) drawCorrelation(ctx, w, h - strip, strip, a, p, !spectrum);
  };
  const ref = useCanvas(draw);
  return (
    <div
      className="scope-screen"
      style={{ height: '100%' }}
      aria-label={spectrum ? 'spectrum analyser' : 'stereo correlation'}
    >
      <canvas ref={ref} style={{ height: '100%' }} />
    </div>
  );
}

/** Stereo analyser VUs when the module exposes them, else the worklet meter feed. */
export function MeterDisplay({ m }: { m: ModuleInstance }): ReactNode {
  const spectrum = useRackStore(() => m.sws.spectrum === 1);
  const phase = useRackStore(() => m.sws.phase === 1);
  const analysis = m.ext.analysis as OutAnalysis | undefined;
  const l = m.ext.analyserL as AnalyserNode | undefined;
  const r = m.ext.analyserR as AnalyserNode | undefined;
  const bufL = m.ext.bufL as Buf | undefined;
  const bufR = m.ext.bufR as Buf | undefined;
  if (analysis && (spectrum || phase))
    return <AnalysisDisplay a={analysis} spectrum={spectrum} phase={phase} />;
  if (!l || !r) return <FeedMeter m={m} />;
  return (
    <div className="meter-pair">
      <ChannelMeter analyser={l} buffer={bufL} label="left" />
      <ChannelMeter analyser={r} buffer={bufR} label="right" />
    </div>
  );
}
