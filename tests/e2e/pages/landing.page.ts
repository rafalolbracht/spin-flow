import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla strony Landing Page
 * Zgodnie z wytycznymi Playwright - implementacja POM dla maintainable tests
 */
export class LandingPage {
  readonly page: Page;
  readonly loginButton: Locator;
  readonly heroSection: Locator;
  readonly heroHeadline: Locator;
  readonly heroSubheadline: Locator;
  readonly heroCtaButton: Locator;
  readonly featuresSection: Locator;
  readonly logo: Locator;
  readonly themeToggleButton: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Locators - resilient element selection based on actual app structure
    this.logo = page.getByAltText('Spin Flow Logo').first();
    // Są 2 przyciski "Zaloguj" - wybieramy ten w topbar (pierwszy, bez "i zacznij")
    this.loginButton = page.getByRole('button', { name: 'Zaloguj', exact: true });
    this.themeToggleButton = page.getByRole('button', { name: /przełącz na tryb/i });
    
    // Hero section elements
    this.heroSection = page.locator('.text-4xl.lg\\:text-5xl').first();
    this.heroHeadline = page.locator('.text-4xl.lg\\:text-5xl').first();
    this.heroSubheadline = page.locator('.text-xl.lg\\:text-2xl').first();
    // CTA button w hero section - "Zaloguj i zacznij"
    this.heroCtaButton = page.getByRole('button', { name: /zaloguj i zacznij/i });
    
    // Features section
    this.featuresSection = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3');
  }

  /**
   * Nawiguje do landing page
   */
  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Klika przycisk logowania
   */
  async clickLogin() {
    await this.loginButton.click();
  }

  /**
   * Sprawdza czy strona jest widoczna
   */
  async expectToBeVisible() {
    await expect(this.logo).toBeVisible();
    await expect(this.heroSection).toBeVisible();
  }

  /**
   * Sprawdza czy przycisk logowania jest widoczny
   */
  async expectLoginButtonToBeVisible() {
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Sprawdza czy hero section zawiera wymagane elementy
   */
  async expectHeroSectionComplete() {
    await expect(this.heroHeadline).toBeVisible();
    await expect(this.heroSubheadline).toBeVisible();
    await expect(this.heroCtaButton).toBeVisible();
  }

  /**
   * Sprawdza czy features section jest widoczna
   */
  async expectFeaturesSectionToBeVisible() {
    await expect(this.featuresSection).toBeVisible();
  }

  /**
   * Pobiera tytuł strony
   */
  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  /**
   * Take screenshot of the page
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png` });
  }
}

