import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.integration-spec.ts'],
    setupFiles: ['./test/integration/setup.ts'],
    testTimeout: 15000,
    hookTimeout: 15000,
    fileParallelism: false,
  },
});
