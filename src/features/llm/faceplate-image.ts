import { errorMessage, scrub } from './providers/http';
import { IMPL, type ProviderId } from './providers/index';

/** Anthropic has no image generation — that is `unsupported`, never an error. */
export async function generateFaceplateImage(
  provider: ProviderId,
  key: string,
  model: string,
  prompt: string,
): Promise<Blob | { unsupported: true } | { error: string }> {
  const image = IMPL[provider].image;
  if (!image) return { unsupported: true };
  if (!key) return { error: `Add your ${provider} API key first.` };
  if (!model) return { error: `Pick a ${provider} image model first.` };
  try {
    return await image(key, model, prompt);
  } catch (e) {
    return { error: scrub(errorMessage(e), key) };
  }
}
