import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

/**
 * Testy E2E dla strony autoryzacji
 * Uwaga: Testy z prawdziwym Google Auth wymagają dodatkowej konfiguracji
 * Te testy sprawdzają głównie UI i podstawowe interakcje
 */

test.describe('Auth Page', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    await authPage.goto();
  });

  test('powinien wyświetlić stronę logowania', async ({ page }) => {
    // Sprawdź URL
    expect(page.url()).toContain('/auth/login');
    
    // Sprawdź czy przycisk Google jest widoczny
    await authPage.expectGoogleLoginButtonToBeVisible();
  });

  test('powinien wyświetlić przycisk logowania Google', async () => {
    // Verify Google login button is visible
    await authPage.expectGoogleLoginButtonToBeVisible();
  });

  test('powinien mieć dostępne aria labels dla accessibility', async ({ page }) => {
    // Sprawdź accessibility
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
    
    // Button powinien być focusable
    await googleButton.focus();
    await expect(googleButton).toBeFocused();
  });

  test('powinien działać na urządzeniach mobilnych', async ({ page }) => {
    // Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Sprawdź czy UI jest responsywne
    await authPage.expectGoogleLoginButtonToBeVisible();
  });

  // Screenshot test
  test('powinien wyglądać poprawnie (visual regression)', async ({ page }) => {
    await authPage.expectGoogleLoginButtonToBeVisible();
    
    await expect(page).toHaveScreenshot('auth-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});

// Test API - backend validation
test.describe('Auth API', () => {
  test('API endpoint powinien odpowiadać', async ({ request }) => {
    // API testing - sprawdź czy endpoint /api/auth istnieje
    // To wymaga uruchomionej aplikacji
    const response = await request.get('/api/auth/session');
    
    // Dla niezalogowanego użytkownika powinniśmy dostać 401 lub 200 z pustą sesją
    expect([200, 401]).toContain(response.status());
  });
});

