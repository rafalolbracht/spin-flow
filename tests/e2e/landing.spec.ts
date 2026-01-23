import { test, expect } from '@playwright/test';
import { LandingPage } from './pages/landing.page';

/**
 * Testy E2E dla Landing Page
 * Zgodnie z wytycznymi Playwright:
 * - Page Object Model
 * - Resilient locators
 * - Auto-wait
 * - Visual comparison (screenshot)
 */

test.describe('Landing Page', () => {
  let landingPage: LandingPage;

  // Test hooks dla setup
  test.beforeEach(async ({ page }) => {
    landingPage = new LandingPage(page);
    await landingPage.goto();
  });

  test('powinien wyświetlić stronę główną', async () => {
    // Sprawdź czy strona jest widoczna
    await landingPage.expectToBeVisible();

    // Sprawdź tytuł strony
    const title = await landingPage.getTitle();
    expect(title).toContain('Spin Flow');
  });

  test('powinien wyświetlić przycisk logowania', async () => {
    // Sprawdź czy przycisk logowania jest widoczny
    await landingPage.expectLoginButtonToBeVisible();
  });

  test('powinien wyświetlić kompletną hero section', async () => {
    // Sprawdź czy hero section zawiera wszystkie elementy
    await landingPage.expectHeroSectionComplete();
  });

  test('powinien wyświetlić sekcję features', async () => {
    // Sprawdź czy features section jest widoczna
    await landingPage.expectFeaturesSectionToBeVisible();
  });

  test('powinien przekierować do strony logowania po kliknięciu przycisku', async ({ page }) => {
    // Kliknij przycisk logowania w topbar
    await landingPage.clickLogin();

    // Sprawdź czy nastąpiło przekierowanie do /auth/login
    await page.waitForURL(/\/auth\/login/, { timeout: 10000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('powinien mieć responsywny layout', async ({ page }) => {
    // Test responsywności - mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await landingPage.expectToBeVisible();
    await landingPage.expectLoginButtonToBeVisible();

    // Test responsywności - tablet
    await page.setViewportSize({ width: 768, height: 1024 });
    await landingPage.expectToBeVisible();
    await landingPage.expectLoginButtonToBeVisible();

    // Test responsywności - desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await landingPage.expectToBeVisible();
    await landingPage.expectLoginButtonToBeVisible();
  });

  test('powinien załadować się w akceptowalnym czasie', async () => {
    const startTime = Date.now();

    await landingPage.goto();
    await landingPage.expectToBeVisible();

    const loadTime = Date.now() - startTime;

    // Strona powinna załadować się w mniej niż 5 sekund (Angular + Astro SSR)
    expect(loadTime).toBeLessThan(5000);
  });

  // Visual regression test (screenshot comparison)
  // Uwaga: Przy pierwszym uruchomieniu Playwright utworzy baseline screenshot
  test('powinien wyglądać poprawnie (visual regression)', async ({ page }) => {
    // Baselines są obecnie utrzymywane lokalnie na Windows (win32).
    // CI uruchamia testy na Linux, co powoduje brak snapshotów / różnice renderingu fontów.
    test.skip(!!process.env.CI, 'Visual regression jest wyłączony w CI (brak baseline snapshotów linuxowych).');

    await landingPage.expectToBeVisible();

    // Poczekaj na pełne załadowanie obrazków
    await page.waitForLoadState('networkidle');

    // Screenshot comparison - Playwright automatycznie porówna z baseline
    await expect(page).toHaveScreenshot('landing-page.png', {
      fullPage: true,
      maxDiffPixels: 200, // Tolerancja dla animacji i różnic renderowania
    });
  });
});

