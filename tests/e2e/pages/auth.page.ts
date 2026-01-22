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
    // logi z przeglądarki do outputu testu (w CI bardzo pomaga)
    // eslint-disable-next-line no-console
    this.page.on("pageerror", (err) => console.error("PAGEERROR:", err));
    // eslint-disable-next-line no-console
    this.page.on("console", (msg) => console.log("BROWSER:", msg.type(), msg.text()));

    // nie czekamy na networkidle (w SPA potrafi nigdy nie zajść)
    await this.page.goto("/auth/login", { waitUntil: "domcontentloaded" });

    // krótka pauza na mount Angular/PrimeNG
    await this.page.waitForTimeout(500);

    // jeśli element nadal nie istnieje, wypisz fragment HTML (żeby wiedzieć co jest renderowane)
    const count = await this.googleLoginButton.count();
    if (count === 0) {
      const html = await this.page.content();
      // eslint-disable-next-line no-console
      console.log("URL:", this.page.url());
      // eslint-disable-next-line no-console
      console.log("HTML_SNIPPET:", html.slice(0, 4000));
    }
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

