import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    // These sheets are read as text by drift guards (tokens, control geometry); without this
    // vitest stubs a CSS import to '' and those guards pass against an empty string.
    css: { include: [/tokens\.css|controls\.css|panel\.css|base\.css|cables\.css|mix8\.css/] },
  },
});
