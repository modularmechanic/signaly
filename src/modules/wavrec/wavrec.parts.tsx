import { useReducer, useRef, type ReactNode } from 'react';
import { getAudioContext } from '../../engine/audio-context';
import type { ModuleInstance } from '../../engine/types';
import { useWorkletFeed } from '../../hooks/module-api';
import { encodeWav, toInt16, wavSeconds, type Samples } from '../../storage/wav';
import { Button } from '../../ui/atoms/button';
import './wavrec.css';

interface RecMsg {
  t: string;
  v?: unknown;
}

interface Tape {
  chunks: Samples[];
  bytes: number;
}

/** The recording lives on `m.ext` rather than in React state: it is tens of megabytes and must
    survive a re-render without being copied. Samples arrive as 16-bit immediately — the file is
    16-bit anyway, so keeping floats would double the memory for nothing. */
function tapeOf(m: ModuleInstance): Tape {
  const ext = m.ext as { tape?: Tape };
  ext.tape ??= { chunks: [], bytes: 0 };
  return ext.tape;
}

export function WavRecParts({ m }: { m: ModuleInstance }): ReactNode {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const tape = tapeOf(m);
  // Redrawing on every 85 ms chunk would repaint the panel 12 times a second for no gain; the
  // readout only needs to move when the whole second does.
  const shown = useRef(-1);

  useWorkletFeed<RecMsg>(m, (msg) => {
    if (msg.t === 'pcm' && msg.v instanceof Float32Array) {
      tape.chunks.push(toInt16(msg.v));
      tape.bytes += msg.v.length * 2;
      return;
    }
    if (msg.t === 'text' && typeof msg.v === 'string') {
      m.ext.text = msg.v;
      bump();
    }
  });

  const rate = getAudioContext().sampleRate;
  const secs = wavSeconds(tape.chunks, 2, rate);
  if (Math.floor(secs) !== shown.current) shown.current = Math.floor(secs);

  const save = (): void => {
    if (!tape.chunks.length) return;
    const url = URL.createObjectURL(encodeWav(tape.chunks, 2, rate));
    const a = document.createElement('a');
    a.href = url;
    a.download = `signaly-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.wav`;
    a.click();
    // Firefox cancels an in-flight download if the object URL dies in the same task.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const erase = (): void => {
    tape.chunks.length = 0;
    tape.bytes = 0;
    bump();
  };

  const mb = (tape.bytes / 1e6).toFixed(1);
  return (
    <div className="wavrec">
      <div className="text-screen">{typeof m.ext.text === 'string' ? m.ext.text : 'READY 0:00'}</div>
      <div className="wavrec-size">{tape.chunks.length ? `${secs.toFixed(1)}s · ${mb} MB` : 'no take'}</div>
      <div className="wavrec-buttons">
        <Button disabled={!tape.chunks.length} onClick={save}>
          Save WAV
        </Button>
        <Button disabled={!tape.chunks.length} onClick={erase}>
          Erase
        </Button>
      </div>
    </div>
  );
}

export const parts = WavRecParts;
