import { dig, getJson, postJson } from './http';
import type { Provider } from './index';

const BASE = 'https://api.anthropic.com/v1';
const TOOL = 'emit_module';

// The browser-access opt-in is what makes a keyless-proxy BYOK app possible at all.
const headers = (key: string): Record<string, string> => ({
  'x-api-key': key,
  'anthropic-version': '2023-06-01',
  'anthropic-dangerous-direct-browser-access': 'true',
});

const strings = (rows: unknown, field: string): string[] =>
  Array.isArray(rows) ? rows.map((r) => dig(r, field)).filter((v): v is string => typeof v === 'string') : [];

export const provider: Provider = {
  // Claude has no response_format: a single forced tool is the JSON mode.
  async chatJson(key, model, system, user, schema) {
    const data = await postJson(
      `${BASE}/messages`,
      headers(key),
      {
        model,
        max_tokens: 8192,
        system,
        tools: [
          {
            name: TOOL,
            description: 'Emit one synth module definition and its DSP source.',
            input_schema: schema,
          },
        ],
        tool_choice: { type: 'tool', name: TOOL },
        messages: [{ role: 'user', content: user }],
      },
      'Claude',
    );
    const content = dig(data, 'content');
    const block = Array.isArray(content) ? content.find((b) => dig(b, 'type') === 'tool_use') : undefined;
    const input = dig(block, 'input');
    if (input === undefined) throw new Error('Claude returned no module payload');
    return input;
  },

  async listModels(key) {
    const data = await getJson(`${BASE}/models?limit=100`, headers(key), 'Claude models');
    return strings(dig(data, 'data'), 'id');
  },
};
