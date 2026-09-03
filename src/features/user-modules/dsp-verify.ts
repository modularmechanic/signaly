const RENDER_FRAMES = 8192;
const RENDER_RATE = 44100;
const TIMEOUT_MS = 3000;
const MAX_ABS = 100;

function scan(buffer: AudioBuffer): string | null {
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < data.length; i++) {
      const x = data[i] ?? 0;
      if (!Number.isFinite(x)) return 'DSP produced NaN or Infinity';
      if (x > MAX_ABS || x < -MAX_ABS) return `DSP produced an out-of-range sample (${x.toFixed(2)})`;
    }
  }
  return null;
}

/** Renders the processor standalone. Returns null when the output is sane, else a message. */
export async function verifyDsp(code: string, processorName: string, outs: number): Promise<string | null> {
  // Read at call time: jsdom has neither, and tests stub them.
  const Ctx = globalThis.OfflineAudioContext as typeof OfflineAudioContext | undefined;
  const Node = globalThis.AudioWorkletNode as typeof AudioWorkletNode | undefined;
  if (!Ctx || !Node) return 'audio verification is unavailable in this environment';
  const count = Math.max(1, Math.min(8, Math.trunc(outs) || 1));
  const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let close: (() => Promise<void>) | undefined;
  try {
    const ctx = new Ctx(count, RENDER_FRAMES, RENDER_RATE);
    close = (ctx as { close?: () => Promise<void> }).close?.bind(ctx);
    const render = (async (): Promise<AudioBuffer> => {
      await ctx.audioWorklet.addModule(url);
      const node = new Node(ctx, processorName, {
        numberOfOutputs: count,
        outputChannelCount: Array.from({ length: count }, () => 1),
      });
      for (let i = 0; i < count; i++) node.connect(ctx.destination, i);
      return ctx.startRendering();
    })();
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`DSP did not render within ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
    });
    return scan(await Promise.race([render, timeout]));
  } catch (e) {
    return e instanceof Error ? e.message : 'DSP failed to render';
  } finally {
    clearTimeout(timer);
    // Bounds the leak, not the wedge: an infinite loop inside the worklet cannot be
    // pre-empted from the main thread, so that render thread stays busy until the tab reloads.
    try {
      await close?.();
    } catch {
      /* some contexts have no close, or reject once rendering has started */
    }
    URL.revokeObjectURL(url);
  }
}
