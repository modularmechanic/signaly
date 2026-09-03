import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModuleInstance } from '../../engine/types';
import {
  decodeSample,
  getSample,
  newSampleId,
  saveSample,
  type DecodedSample,
} from '../../storage/sample-store';
import { Button } from '../atoms/button';
import './sample-picker.css';

export interface SampleMeta {
  name: string;
  duration: number;
}

export interface SamplePickerProps {
  /** current sample id, read from the module's own `m.ext` by its `parts.tsx` */
  sampleId: string | undefined;
  sampleName: string | undefined;
  /** fires once decode succeeds — from a freshly picked file OR a reload of `sampleId`.
      `data` is this component's own copy; the caller must copy it again before transfer. */
  onLoaded: (id: string, data: Float32Array, meta: SampleMeta) => void;
}

/** Send a sample buffer to the worklet as a transferable. Posts a FRESH COPY every time —
    the array handed to `[data.buffer]` is detached by the transfer, so the caller's own copy
    (kept in `m.ext`) must never be the one posted twice. */
export function postSampleToWorklet(m: ModuleInstance, data: Float32Array): void {
  const copy = data.slice();
  m.node?.port.postMessage({ t: 'sample', v: copy }, [copy.buffer]);
}

function drawWave(canvas: HTMLCanvasElement, data: Float32Array): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#68f3bf';
  ctx.beginPath();
  const step = Math.max(1, Math.floor(data.length / w));
  for (let x = 0; x < w; x++) {
    let min = 1;
    let max = -1;
    const start = x * step;
    for (let i = start; i < start + step && i < data.length; i++) {
      const v = data[i] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    ctx.moveTo(x + 0.5, h / 2 - max * h * 0.45);
    ctx.lineTo(x + 0.5, h / 2 - min * h * 0.45);
  }
  ctx.stroke();
}

/** File picker + decoder for the shared sample infrastructure — SAMPLER, SLICER and CLOUD each
    drop this straight into their `display: 'text'` slot. Owns the whole load path: picking a
    file, decoding and validating it, saving it to IndexedDB, and re-loading `sampleId` (from a
    restored patch) the same way. A missing sample (deleted from the browser's storage) reports
    itself rather than throwing; a rejected file (too big, too long, undecodable) is never saved. */
export function SamplePicker({ sampleId, sampleName, onLoaded }: SamplePickerProps): ReactNode {
  const [meta, setMeta] = useState<SampleMeta | null>(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const loadedId = useRef<string | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const commit = (id: string, name: string, dec: DecodedSample): void => {
    setMsg('');
    setMeta({ name, duration: dec.duration });
    loadedId.current = id;
    if (canvasRef.current) drawWave(canvasRef.current, dec.data);
    onLoaded(id, dec.data, { name, duration: dec.duration });
  };

  // A patch restored `sampleId` this component never saw: pull it back from IndexedDB.
  useEffect(() => {
    if (!sampleId || sampleId === loadedId.current) return;
    let live = true;
    setBusy(true);
    void getSample(sampleId).then(async (blob) => {
      if (!live) return;
      if (!blob) {
        setBusy(false);
        setMsg('no sample');
        return;
      }
      const dec = await decodeSample(blob);
      if (!live) return;
      setBusy(false);
      if ('error' in dec) setMsg(dec.error);
      else commit(sampleId, sampleName ?? 'sample', dec);
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sampleId]);

  const pick = async (file: File): Promise<void> => {
    setBusy(true);
    const dec = await decodeSample(file);
    if ('error' in dec) {
      setBusy(false);
      setMsg(dec.error);
      return;
    }
    const id = newSampleId();
    await saveSample(id, file);
    setBusy(false);
    commit(id, file.name, dec);
  };

  return (
    <div className="sample-picker">
      <label className="sample-picker-btn">
        <input
          type="file"
          accept="audio/*"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void pick(f);
          }}
        />
        <Button disabled={busy}>{busy ? 'Loading…' : 'Load sample'}</Button>
      </label>
      {meta ? (
        <div className="sample-picker-info">
          <span className="sample-picker-name">{meta.name}</span>
          <span className="sample-picker-dur">{meta.duration.toFixed(1)}s</span>
        </div>
      ) : (
        <div className="sample-picker-info sample-picker-empty">{msg || 'no sample'}</div>
      )}
      <canvas ref={canvasRef} className="sample-picker-wave" width={220} height={40} />
      {meta && msg ? <div className="sample-picker-msg">{msg}</div> : null}
    </div>
  );
}
