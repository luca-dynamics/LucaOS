import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@luca/orb-design': fileURLToPath(new URL('./packages/luca-orb-design/src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
  },
});
