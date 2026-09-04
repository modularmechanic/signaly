import { Base, ch, clamp, type InMsg, type Params } from '../../engine/dsp-prelude';

/** Interleaved samples per message. 4096 frames is ~85 ms at 48 kHz: often enough that the
    readout moves, rarely enough that the port is not the bottleneck. */
const CHUNK = 8192;
/** A hard stop so a forgotten recording cannot eat the tab: 10 minutes of stereo. */
const MAX_SECONDS = 600;

/** WAV REC — passes stereo through untouched and, while armed, ships the same samples to the
    main thread to be written as a WAV. Audio is ±5 V here and ±1 in a file, so it is scaled on
    the way out; clipping is left to the encoder so a hot record still sounds like what was heard. */
class WavRec extends Base {
  chunk = new Float32Array(CHUNK);
  n = 0;
  frames = 0;
  wasRec = false;
  sentLine = '';

  defaults(): Params {
    return { rec: 0, gain: 1 };
  }

  /** Erase is a two-sided reset: clearing the main thread's copy alone would leave this counter
      running toward the cap, so a wiped recorder would still read STOP 3:20 and could never
      record a full take again. */
  override msg(m: InMsg): void {
    if (m.t !== 'erase') return;
    this.n = 0;
    this.frames = 0;
    this.sentLine = '';
  }

  flush(): void {
    if (this.n === 0) return;
    const out = this.chunk.slice(0, this.n);
    this.n = 0;
    this.port.postMessage({ t: 'pcm', v: out, frames: this.frames }, [out.buffer]);
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const inl = ch(I, 0),
      inr = ch(I, 1);
    const ol = O[0]?.[0],
      or = O[1]?.[0];
    if (!ol || !or) return true;
    const p = this.p;
    const rec = (p.rec ?? 0) >= 0.5;
    const gain = clamp(p.gain ?? 1, 0, 2);
    const cap = MAX_SECONDS * sampleRate;

    for (let i = 0; i < ol.length; i++) {
      const a = inl?.[i] ?? 0;
      // A mono source patched to L alone records as mono in both channels rather than half-silent.
      const b = inr?.[i] ?? a;
      ol[i] = a;
      or[i] = b;
      if (!rec || this.frames >= cap) continue;
      this.chunk[this.n++] = (a * gain) / 5;
      this.chunk[this.n++] = (b * gain) / 5;
      this.frames++;
      // Flushing at the cap too, or the last partial chunk is stranded until REC is toggled.
      if (this.n >= CHUNK || this.frames >= cap) this.flush();
    }

    // Stopping flushes the tail. The readout follows the whole line, not just the seconds:
    // keying on the second alone left a take stopped at 0:00 still reading READY, and a take
    // stopped mid-second still reading REC.
    if (this.wasRec && !rec) this.flush();
    this.wasRec = rec;
    const sec = Math.floor(this.frames / sampleRate);
    const full = this.frames >= cap;
    const label = rec && !full ? 'REC' : full ? 'FULL' : this.frames > 0 ? 'STOP' : 'READY';
    const line = `${label} ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    if (line !== this.sentLine) {
      this.sentLine = line;
      this.port.postMessage({ t: 'text', v: line });
    }
    return true;
  }
}

registerProcessor('wavrec', WavRec);
