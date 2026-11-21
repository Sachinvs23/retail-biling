import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  fmt: {
    ignorePatterns: ['src/routeTree.gen.ts'],
    singleQuote: true,
    semi: true,
    trailingComma: 'all',
    printWidth: 80,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
  },
  lint: {
    plugins: ['react', 'typescript', 'oxc'],
    rules: {
      'react/rules-of-hooks': 'error',
      'react/only-export-components': [
        'warn',
        {
          allowConstantExport: true,
        },
      ],
      'vite-plus/prefer-vite-plus-imports': 'error',
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: 'vite-plus',
        specifier: 'vite-plus/oxlint-plugin',
      },
    ],
  },
  plugins: lazyPlugins(() => [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
  ]),
});
