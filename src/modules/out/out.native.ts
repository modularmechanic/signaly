import { getAudioContext } from '../../engine/audio-context';
import type { ModuleInstance, NativeSpec } from '../../engine/types';

/** The optional raw tap feeding the spectrum / correlation displays. Parallel to the
    audible route, so toggling it can never mute or colour the speakers. */
export interface OutAnalysis {
  l: AnalyserNode;
  r: AnalyserNode;
  phaseL: Float32Array<ArrayBuffer>;
  phaseR: Float32Array<ArrayBuffer>;
  spectrumL: Float32Array<ArrayBuffer>;
  spectrumR: Float32Array<ArrayBuffer>;
  on: boolean;
  setEnabled: (enabled: boolean) => void;
}

interface OutExt {
  gl: GainNode;
  gr: GainNode;
}

const softClip = (): Float32Array<ArrayBuffer> => {
  const c = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) c[i] = Math.tanh((i / 511.5 - 1) * 1.4) / Math.tanh(1.4);
  return c;
};

/** MAIN OUT — the rack's only sink: in -> LEVEL -> soft limiter -> destination.
    `m.ext.analyserL/R` + `m.ext.bufL/bufR` are the always-on VU taps;
    `m.ext.analysis` is the switch-gated spectrum / phase tap. */
export const native: NativeSpec = {
  audio(m) {
    const ac = getAudioContext();
    const inL = ac.createGain();
    const inR = ac.createGain();
    const gl = ac.createGain();
    const gr = ac.createGain();
    gl.gain.value = gr.gain.value = (m.vals.level ?? 0.5) / 5;

    const curve = softClip();
    const shL = ac.createWaveShaper();
    const shR = ac.createWaveShaper();
    shL.curve = curve;
    shR.curve = curve;
    const merger = ac.createChannelMerger(2);
    // Fixed -6 dB trim after the limiter: a raw ±5 V oscillator at default LEVEL
    // otherwise lands near 0 dBFS, which is painfully loud on headphones.
    const master = ac.createGain();
    master.gain.value = 0.5;

    inL.connect(gl);
    inR.connect(gr);
    gl.connect(shL).connect(merger, 0, 0);
    gr.connect(shR).connect(merger, 0, 1);
    merger.connect(master);
    master.connect(ac.destination);

    const vuL = ac.createAnalyser();
    const vuR = ac.createAnalyser();
    vuL.fftSize = vuR.fftSize = 512;
    vuL.smoothingTimeConstant = vuR.smoothingTimeConstant = 0.72;
    inL.connect(vuL);
    inR.connect(vuR);

    const anL = ac.createAnalyser();
    const anR = ac.createAnalyser();
    anL.fftSize = anR.fftSize = 2048;
    anL.smoothingTimeConstant = anR.smoothingTimeConstant = 0.7;
    const analysis: OutAnalysis = {
      l: anL,
      r: anR,
      phaseL: new Float32Array(anL.fftSize),
      phaseR: new Float32Array(anR.fftSize),
      spectrumL: new Float32Array(anL.frequencyBinCount),
      spectrumR: new Float32Array(anR.frequencyBinCount),
      on: false,
      setEnabled(enabled) {
        if (enabled === analysis.on) return;
        if (enabled) {
          inL.connect(anL);
          inR.connect(anR);
        } else {
          inL.disconnect(anL);
          inR.disconnect(anR);
        }
        analysis.on = enabled;
      },
    };

    (m.natives ??= []).push(inL, inR, gl, gr, shL, shR, merger, master, vuL, vuR, anL, anR);
    m.jacks.in.l = { node: inL, idx: 0 };
    m.jacks.in.r = { node: inR, idx: 0 };
    m.ext.gl = gl;
    m.ext.gr = gr;
    m.ext.analyserL = vuL;
    m.ext.analyserR = vuR;
    m.ext.bufL = new Float32Array(vuL.fftSize);
    m.ext.bufR = new Float32Array(vuR.fftSize);
    m.ext.analysis = analysis;
    analysis.setEnabled(tapWanted(m));
  },

  param(m, id, v) {
    if (id === 'level') {
      const { gl, gr } = m.ext as unknown as OutExt;
      const t = getAudioContext().currentTime;
      gl.gain.setTargetAtTime(v / 5, t, 0.01);
      gr.gain.setTargetAtTime(v / 5, t, 0.01);
    } else if (id === 'spectrum' || id === 'phase') {
      (m.ext.analysis as OutAnalysis | undefined)?.setEnabled(tapWanted(m));
    }
  },
};

function tapWanted(m: ModuleInstance): boolean {
  return (m.sws.spectrum ?? 0) === 1 || (m.sws.phase ?? 0) === 1;
}
