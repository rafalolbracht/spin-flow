import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Środowisko testowe - jsdom dla testów komponentów Angular
    environment: 'jsdom',

    // Globalne pliki setup
    setupFiles: ['./tests/setup/vitest.setup.ts'],

    // Włącz globals dla wygodniejszych asercji
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.config.{js,ts,mjs}',
        '**/*.d.ts',
        '**/types.ts',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/db/database.types.ts', // Auto-generated types
      ],
      // Minimalny próg pokrycia (opcjonalnie - zakomentowane dla początku)
      // thresholds: {
      //   lines: 80,
      //   functions: 80,
      //   branches: 80,
      //   statements: 80,
      // },
    },

    // Timeouty
    testTimeout: 10000,
    hookTimeout: 10000,

    // Włącz watch mode podczas developmentu
    watch: false,

    // Include patterns
    include: [
      'tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    // Exclude patterns
    exclude: ['node_modules', 'dist', 'e2e', 'tests/e2e'],

    // Reporters
    reporters: ['verbose'],

    // Isolated execution dla każdego testu (zapobiega memory leaks)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '~': resolve(__dirname, './'),
    },
  },
});

