import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    exclude: ['node_modules/**', 'lib/**', '.next/**'],
    testTimeout: 15_000,
    // Bound worker contention while Next's local server is running; keep test
    // timeouts meaningful instead of extending them to mask slow tests.
    maxWorkers: 2,
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
