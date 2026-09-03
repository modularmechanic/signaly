/// <reference types="@types/audioworklet" />
// Worklet bundle entry. Each matched file ends with registerProcessor(...).
// NEVER import this from the main thread — see audio-context.ts.
import.meta.glob('../modules/*/*.dsp.ts', { eager: true });
