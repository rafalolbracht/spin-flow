import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Załaduj zmienne z .env dla testów E2E
dotenv.config();

/**
 * Konfiguracja Playwright dla testów E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Katalog z testami E2E
  testDir: './tests/e2e',

  // Timeout dla pojedynczego testu (30s)
  timeout: 30 * 1000,

  // Maximum time expect() should wait for the condition to be met
  expect: {
    timeout: 5000,
  },

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Parallel execution
  workers: process.env.CI ? 1 : undefined,

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'playwright-results.json' }],
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.BASE_URL || 'http://localhost:4300',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Locale i timezone
    locale: 'pl-PL',
    timezoneId: 'Europe/Warsaw',

    // Viewport size
    viewport: { width: 1280, height: 720 },
  },

  // Konfiguracja projektu - tylko Chromium/Desktop Chrome zgodnie z wytycznymi
  projects: [
    // Setup - uruchamia się przed testami, czyści bazę
    {
      name: 'setup',
      testMatch: /global\.setup\.ts/,
      teardown: 'cleanup',
    },
    // Cleanup - uruchamia się po testach (teardown dla setup)
    {
      name: 'cleanup',
      testMatch: /global\.teardown\.ts/,
    },
    // Główny projekt z testami E2E
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  // Web Server - uruchom dev server przed testami
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4300',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output folder for test artifacts
  outputDir: 'test-results/',

  // Folder for test artifacts such as screenshots, videos, traces, etc.
  snapshotDir: './tests/e2e/__snapshots__',
});

