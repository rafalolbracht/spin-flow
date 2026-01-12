import { test as base, expect } from '@playwright/test';

/**
 * Extended Playwright test with authentication fixture
 *
 * Automatycznie dodaje header 'x-test-mode: true' do wszystkich requestów,
 * co włącza tryb testowy w middleware i mockuje autentykację.
 */

export const test = base.extend({
  page: async ({ page }, use) => {
    // Dodaj header x-test-mode do wszystkich requestów
    await page.setExtraHTTPHeaders({
      'x-test-mode': 'true',
    });

    // Użyj strony w testach
    await use(page);
  },
});

export { expect };
