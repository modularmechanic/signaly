import { getKeys, getModel } from '../../storage/api-key-store';
import { activeProvider } from './active-provider';
import { generateFaceplateImage } from './faceplate-image';
import { PROPOSAL_SCHEMA, SYSTEM_PROMPT } from './module-builder-prompt';
import { parseProposal, type ModuleProposal } from './module-proposal';
import { errorMessage, scrub } from './providers/http';
import { IMPL, type Provider, type ProviderId } from './providers/index';

export type { Provider, ProviderId };
export { activeProvider, setActiveProvider } from './active-provider';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export const canGenerateImages = (id: ProviderId): boolean => IMPL[id].image !== undefined;

/** Image generation is not tied to the chat provider: a user chatting with Claude, which cannot
    generate images, should still get faceplates from a Gemini key they already hold. Gemini first
    because its image generation is free; OpenAI's browser CORS posture is also unverified. */
const IMAGE_ORDER: readonly ProviderId[] = ['gemini', 'openai'];

export function imageProvider(): ProviderId | null {
  const keys = getKeys();
  return IMAGE_ORDER.find((id) => canGenerateImages(id) && !!keys[id]) ?? null;
}

interface Session {
  id: ProviderId;
  key: string;
  model: string;
}

function session(): Session | { error: string } {
  const id = activeProvider();
  if (!id) return { error: 'Add an API key in Settings to use the module builder.' };
  const key = getKeys()[id];
  if (!key) return { error: `Add your ${id} API key in Settings.` };
  const model = getModel(id);
  if (!model) return { error: `Pick a ${id} model in Settings.` };
  return { id, key, model };
}

// One string per turn: all three providers take the same transcript, no per-provider message arrays.
const transcript = (history: ChatTurn[], prompt: string): string =>
  [...history.map((t) => `${t.role === 'user' ? 'USER' : 'ASSISTANT'}: ${t.text}`), `USER: ${prompt}`].join(
    '\n\n',
  );

export async function generateModule(
  userPrompt: string,
  history: ChatTurn[] = [],
): Promise<ModuleProposal | { error: string }> {
  const s = session();
  if ('error' in s) return s;
  try {
    const raw = await IMPL[s.id].chatJson(
      s.key,
      s.model,
      SYSTEM_PROMPT,
      transcript(history, userPrompt),
      PROPOSAL_SCHEMA,
    );
    return parseProposal(raw);
  } catch (e) {
    return { error: scrub(errorMessage(e), s.key) };
  }
}

export async function listModels(id: ProviderId): Promise<string[] | { error: string }> {
  const key = getKeys()[id];
  if (!key) return { error: `Add your ${id} API key first.` };
  try {
    return await IMPL[id].listModels(key);
  } catch (e) {
    return { error: scrub(errorMessage(e), key) };
  }
}

/** `imageModel` defaults to that provider's chosen model — pass one when the two differ. */
export async function generateFaceplate(
  prompt: string,
  imageModel?: string,
): Promise<Blob | { unsupported: true } | { error: string }> {
  const id = imageProvider();
  if (!id) return { unsupported: true };
  const key = getKeys()[id];
  if (!key) return { error: `Add your ${id} API key in Settings.` };
  const model = imageModel ?? getModel(id);
  if (!model) return { error: `Pick a ${id} model in Settings.` };
  return generateFaceplateImage(id, key, model, prompt);
}
