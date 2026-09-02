import type { Provider as KeyProvider } from '../../../storage/api-key-store';
import { provider as anthropic } from './anthropic';
import { provider as gemini } from './gemini';
import { provider as openai } from './openai';

export type ProviderId = KeyProvider;

export interface Provider {
  chatJson(key: string, model: string, system: string, user: string, schema: object): Promise<unknown>;
  listModels(key: string): Promise<string[]>;
  /** Absent on providers with no image generation (Anthropic). */
  image?(key: string, model: string, prompt: string): Promise<Blob>;
}

export const IMPL: Record<ProviderId, Provider> = { anthropic, openai, gemini };
