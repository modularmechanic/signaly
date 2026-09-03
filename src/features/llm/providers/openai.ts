import { b64Blob, dig, getJson, postJson } from './http';
import type { Provider } from './index';

const BASE = 'https://api.openai.com/v1';
// Dumb family filter — an unknown new chat model must still show up in the list.
const NOT_CHAT = [
  'embedding',
  'whisper',
  'tts',
  'audio',
  'dall-e',
  'image',
  'moderation',
  'transcribe',
  'speech',
];

const headers = (key: string): Record<string, string> => ({ authorization: `Bearer ${key}` });

export const provider: Provider = {
  async chatJson(key, model, system, user, schema) {
    const data = await postJson(
      `${BASE}/chat/completions`,
      headers(key),
      {
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: { name: 'module_proposal', strict: true, schema },
        },
      },
      'OpenAI',
    );
    const refusal = dig(data, 'choices', 0, 'message', 'refusal');
    if (typeof refusal === 'string' && refusal) throw new Error(`OpenAI declined: ${refusal}`);
    const content = dig(data, 'choices', 0, 'message', 'content');
    if (typeof content !== 'string' || !content) throw new Error('OpenAI returned no module payload');
    return JSON.parse(content) as unknown;
  },

  async listModels(key) {
    const data = await getJson(`${BASE}/models`, headers(key), 'OpenAI models');
    const rows = dig(data, 'data');
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => dig(r, 'id'))
      .filter((v): v is string => typeof v === 'string' && !NOT_CHAT.some((n) => v.includes(n)))
      .sort();
  },

  async image(key, model, prompt) {
    const data = await postJson(
      `${BASE}/images/generations`,
      headers(key),
      { model, prompt, size: '1024x1024', n: 1 },
      'OpenAI images',
    );
    const b64 = dig(data, 'data', 0, 'b64_json');
    if (typeof b64 !== 'string' || !b64) throw new Error('OpenAI returned no image data');
    return b64Blob(b64, 'image/png');
  },
};
