import { getAudioContext } from '../../engine/audio-context';
import { forgetPanel } from '../../modules/panel-layout';
import { registerSpec, unregisterSpec } from '../../modules/registry';
import { bindProcessorName, transpileDsp } from './dsp-transpile';
import { verifyDsp } from './dsp-verify';
import { processorNameFor, userModuleId, type UserModule } from './schema';

type Result = { ok: true; id: string } | { ok: false; error: string };

/** Transpile, verify offline, then load into the live context. Nothing skips a step. */
export async function registerUserModule(um: UserModule): Promise<Result> {
  const id = userModuleId(um.slug);
  const worklet = processorNameFor(um);
  const built = transpileDsp(bindProcessorName(um.dsp, worklet), worklet);
  if (!built.ok) return built;
  const failure = await verifyDsp(built.code, worklet, um.def.outs.length);
  if (failure) return { ok: false, error: failure };
  const url = URL.createObjectURL(new Blob([built.code], { type: 'application/javascript' }));
  try {
    await getAudioContext().audioWorklet.addModule(url);
  } catch (e) {
    return { ok: false, error: `worklet load failed: ${e instanceof Error ? e.message : 'unknown error'}` };
  } finally {
    URL.revokeObjectURL(url);
  }
  // The author's `cat` is kept as-is; the browser lists user modules under it.
  registerSpec({ def: { ...um.def, id, worklet } });
  forgetPanel(id);
  return { ok: true, id };
}

export function unregisterUserModule(slug: string): void {
  const id = userModuleId(slug);
  unregisterSpec(id);
  forgetPanel(id);
}
