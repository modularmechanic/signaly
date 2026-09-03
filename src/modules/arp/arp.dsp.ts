import { Base, ch, clamp, type Params } from '../../engine/dsp-prelude';

/** Chord shapes as semitone offsets, in CHORD-knob order. Inlined rather than shared:
    each .dsp.ts is a separate ES module in the worklet bundle. */
const CHORDS: readonly number[][] = [
  [0, 4, 7, 12],
  [0, 3, 7, 12],
  [0, 4, 7, 11],
  [0, 3, 7, 10],
  [0, 4, 7, 10],
  [0, 5, 7, 12],
  [0, 3, 6, 9],
  [0, 4, 8, 12],
  [0, 7, 12, 19],
  [0, 2, 4, 5, 7, 9, 11],
  [0, 2, 3, 5, 7, 8, 10],
  [0, 3, 5, 7, 10],
];
const NAMES = [
  'MAJ',
  'MIN',
  'MAJ7',
  'MIN7',
  'DOM7',
  'SUS4',
  'DIM7',
  'AUG',
  '5TH',
  'MAJ SCL',
  'MIN SCL',
  'PENTA',
];
const SHAPES = ['UP', 'DOWN', 'UP/DN', 'RAND'];

class Arp extends Base {
  idx = 0;
  lc = 0;
  gTimer = 0;
  period = 4800;
  lastEdge = 0;
  frame = 0;
  cv = 0;
  eoc = 0;
  rs = 246813;
  sentChord = -1;
  sentShape = -1;

  defaults(): Params {
    return { chord: 0, octs: 1, shape: 0, glen: 0.6 };
  }

  rnd(): number {
    this.rs = (this.rs * 1103515245 + 12345) & 0x7fffffff;
    return this.rs / 0x7fffffff;
  }

  process(I: Float32Array[][], O: Float32Array[][]): boolean {
    const cvO = O[0]?.[0];
    const gtO = O[1]?.[0];
    const eocO = O[2]?.[0];
    if (!cvO || !gtO || !eocO) return true;
    const clk = ch(I, 0);
    const root = ch(I, 1);
    const gate = ch(I, 2);
    const scv = ch(I, 3);
    const ccv = ch(I, 4);
    const ocv = ch(I, 5);
    const p = this.p;
    for (let i = 0; i < cvO.length; i++) {
      this.frame++;
      const c = clk?.[i] ?? 0;
      const held = gate ? gate[i]! > 2.5 : true; // unpatched HOLD = always running
      if (c > 2.5 && this.lc <= 2.5) {
        this.period = clamp(this.frame - this.lastEdge, 480, sampleRate * 4);
        this.lastEdge = this.frame;
        if (held) this.advance(i, p, root, scv, ccv, ocv);
      }
      this.lc = c;
      if (this.gTimer > 0) this.gTimer--;
      cvO[i] = this.cv;
      gtO[i] = this.gTimer > 0 && held ? 5 : 0;
      eocO[i] = this.eoc && c > 2.5 ? 5 : 0;
    }
    return true;
  }

  /** One clock step: pick the next chord tone, set CV, retrigger the gate. */
  advance(
    i: number,
    p: Params,
    root: Float32Array | null,
    scv: Float32Array | null,
    ccv: Float32Array | null,
    ocv: Float32Array | null,
  ): void {
    const chI = clamp(
      Math.round((p.chord ?? 0) + (ccv?.[i] ?? 0) * (CHORDS.length / 10)),
      0,
      CHORDS.length - 1,
    );
    const tones = CHORDS[chI];
    if (!tones) return;
    const octs = clamp(Math.round((p.octs ?? 1) + (ocv?.[i] ?? 0) * 0.8), 1, 4);
    const shape = clamp(Math.round((p.shape ?? 0) + (scv?.[i] ?? 0) * 0.8), 0, 3);
    const nSteps = tones.length * octs;
    let step: number;
    this.eoc = 0;
    if (shape === 2) {
      const span = Math.max(1, nSteps * 2 - 2);
      this.idx = (this.idx + 1) % span;
      step = this.idx < nSteps ? this.idx : span - this.idx;
    } else if (shape === 3) {
      step = (this.rnd() * nSteps) | 0;
      this.idx = (this.idx + 1) % nSteps;
    } else {
      this.idx = (this.idx + 1) % nSteps;
      step = shape === 1 ? nSteps - 1 - this.idx : this.idx;
    }
    if (this.idx === 0) this.eoc = 1;
    const tone = (tones[step % tones.length] ?? 0) + 12 * ((step / tones.length) | 0);
    this.cv = (root?.[i] ?? 0) + tone / 12;
    this.gTimer = Math.max(200, this.period * clamp(p.glen ?? 0.6, 0.05, 1));
    if (chI !== this.sentChord || shape !== this.sentShape) {
      this.sentChord = chI;
      this.sentShape = shape;
      this.port.postMessage({ t: 'text', v: `${NAMES[chI] ?? ''} ${SHAPES[shape] ?? ''}` });
    }
  }
}

registerProcessor('arp', Arp);
