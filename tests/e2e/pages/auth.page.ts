import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla strony autoryzacji
 */
export class AuthPage {
  readonly page: Page;
  readonly googleLoginButton: Locator;
  readonly loadingSpinner: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Locators
    this.googleLoginButton = page.getByRole('button', { name: /google/i });
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  /**
   * Nawiguje do strony autoryzacji
   */
  async goto() {
    await this.page.goto('/auth/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Klika przycisk logowania Google
   */
  async clickGoogleLogin() {
    await this.googleLoginButton.click();
  }

  /**
   * Sprawdza czy przycisk logowania Google jest widoczny
   */
  async expectGoogleLoginButtonToBeVisible() {
    await expect(this.googleLoginButton).toBeVisible();
  }

  /**
   * Sprawdza czy loading spinner jest widoczny
   */
  async expectLoadingSpinnerToBeVisible() {
    await expect(this.loadingSpinner).toBeVisible();
  }

  /**
   * Sprawdza czy wystąpił błąd
   */
  async expectErrorMessage(message?: string) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }

  /**
   * Czeka na redirect po zalogowaniu
   */
  async waitForRedirectAfterLogin() {
    await this.page.waitForURL(/\/matches|\//, { timeout: 10000 });
  }
}

