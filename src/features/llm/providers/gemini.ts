import { geminiSchema } from '../module-builder-prompt';
import { b64Blob, dig, getJson, postJson } from './http';
import type { Provider } from './index';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// The key travels in x-goog-api-key, never in the URL: URLs end up in devtools, HAR exports
// and extension telemetry. Gemini accepts both forms.
const endpoint = (model: string, method: string): string =>
  `${BASE}/models/${encodeURIComponent(model.replace(/^models\//, ''))}:${method}`;

const auth = (key: string): Record<string, string> => ({ 'x-goog-api-key': key });

const parts = (data: unknown): unknown[] => {
  const p = dig(data, 'candidates', 0, 'content', 'parts');
  return Array.isArray(p) ? p : [];
};

const inline = (part: unknown): unknown => dig(part, 'inlineData') ?? dig(part, 'inline_data');

export const provider: Provider = {
  async chatJson(key, model, system, user, schema) {
    const data = await postJson(
      endpoint(model, 'generateContent'),
      auth(key),
      {
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: geminiSchema(schema),
        },
      },
      'Gemini',
    );
    const text = parts(data)
      .map((p) => dig(p, 'text'))
      .find((t): t is string => typeof t === 'string' && t.length > 0);
    if (!text) throw new Error('Gemini returned no module payload');
    return JSON.parse(text) as unknown;
  },

  async listModels(key) {
    const data = await getJson(`${BASE}/models?pageSize=200`, auth(key), 'Gemini models');
    const rows = dig(data, 'models');
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => dig(r, 'name'))
      .filter((v): v is string => typeof v === 'string')
      .map((n) => n.replace(/^models\//, ''))
      .sort();
  },

  // Images come back through the very same generateContent endpoint, as inline base64.
  async image(key, model, prompt) {
    const data = await postJson(
      endpoint(model, 'generateContent'),
      auth(key),
      {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      },
      'Gemini images',
    );
    const found = parts(data)
      .map(inline)
      .find((d) => typeof dig(d, 'data') === 'string');
    const b64 = dig(found, 'data');
    if (typeof b64 !== 'string') throw new Error('Gemini returned no image data');
    const mime = dig(found, 'mimeType') ?? dig(found, 'mime_type');
    return b64Blob(b64, typeof mime === 'string' ? mime : 'image/png');
  },
};
