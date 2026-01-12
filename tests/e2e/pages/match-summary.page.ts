/* eslint-disable no-console */
import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla strony podsumowania meczu
 */
export class MatchSummaryPage {
  readonly page: Page;
  readonly matchTitle: Locator;
  readonly finalScore: Locator;
  readonly aiReportSection: Locator;
  readonly aiStatus: Locator;
  readonly aiSummary: Locator;
  readonly aiRecommendations: Locator;
  readonly shareButton: Locator;
  readonly backToMatchesButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Match info - używamy rzeczywistych selektorów z komponentu match-header-section
    this.matchTitle = page.locator('.match-header-card'); // Główny kontener nagłówka meczu
    this.finalScore = page.locator('.score-display'); // Kontener z wynikiem setowym

    // AI Report - sekcja z raportem AI (używa p-panel)
    this.aiReportSection = page.locator('p-panel').filter({ hasText: 'Analiza AI' });
    this.aiStatus = page.locator('p-progressSpinner, p-message').first(); // Spinner (pending) lub message (error)
    this.aiSummary = page.locator('h3').filter({ hasText: 'Opis meczu' }).locator('..'); // Parent div z opisem
    this.aiRecommendations = page.locator('h3').filter({ hasText: 'Zalecenia treningowe' }).locator('..'); // Parent div z zaleceniami

    // Actions - przyciski widoczne na stronie
    this.shareButton = page.getByRole('button', { name: /Udostępnij/i });
    this.backToMatchesButton = page.getByRole('button', { name: /Powrót do listy/i });
  }

  /**
   * Nawiguje do strony podsumowania meczu
   */
  async goto(matchId: number) {
    await this.page.goto(`/matches/${matchId}/summary`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sprawdza czy strona została załadowana
   */
  async expectToBeLoaded() {
    // Sprawdź czy przyciski akcji są widoczne (to oznacza że strona się załadowała)
    await expect(this.shareButton).toBeVisible({ timeout: 10000 });
    await expect(this.backToMatchesButton).toBeVisible();
  }

  /**
   * Sprawdza tytuł meczu
   */
  async expectMatchTitle(playerName: string, opponentName: string) {
    await expect(this.matchTitle).toContainText(playerName);
    await expect(this.matchTitle).toContainText(opponentName);
  }

  /**
   * Sprawdza wynik końcowy
   */
  async expectFinalScore(playerSets: number, opponentSets: number) {
    // Sprawdź wynik gracza
    const playerBadge = this.page.locator('.sets-won-badge.player-badge');
    await expect(playerBadge).toHaveText(playerSets.toString());

    // Sprawdź wynik przeciwnika
    const opponentBadge = this.page.locator('.sets-won-badge.opponent-badge');
    await expect(opponentBadge).toHaveText(opponentSets.toString());
  }

  /**
   * Sprawdza status AI report
   */
  async expectAiStatus(status: 'pending' | 'success' | 'error') {
    if (status === 'pending') {
      // Sprawdź czy spinner jest widoczny
      const spinner = this.page.locator('p-progressSpinner');
      await expect(spinner).toBeVisible({ timeout: 5000 });
      await expect(this.page.locator('text=Generowanie raportu AI...')).toBeVisible();
    } else if (status === 'error') {
      // Sprawdź czy jest message error
      await expect(this.page.locator('p-message[severity="error"]')).toBeVisible();
    } else if (status === 'success') {
      // Sprawdź czy są sekcje z treścią AI
      await expect(this.page.locator('h3').filter({ hasText: 'Opis meczu' })).toBeVisible();
      await expect(this.page.locator('h3').filter({ hasText: 'Zalecenia treningowe' })).toBeVisible();
    }
  }

  /**
   * Sprawdza czy AI summary jest widoczny
   */
  async expectAiSummaryToBeVisible() {
    const summaryHeading = this.page.locator('h3').filter({ hasText: 'Opis meczu' });
    await expect(summaryHeading).toBeVisible({ timeout: 5000 });
    
    // Sprawdź czy jest jakiś tekst po nagłówku (nie pusty)
    const summaryContent = summaryHeading.locator('..').locator('.prose');
    await expect(summaryContent).toBeVisible();
  }

  /**
   * Sprawdza czy AI recommendations są widoczne
   */
  async expectAiRecommendationsToBeVisible() {
    const recommendationsHeading = this.page.locator('h3').filter({ hasText: 'Zalecenia treningowe' });
    await expect(recommendationsHeading).toBeVisible({ timeout: 5000 });
    
    // Sprawdź czy jest jakiś tekst po nagłówku (nie pusty)
    const recommendationsContent = recommendationsHeading.locator('..').locator('.prose');
    await expect(recommendationsContent).toBeVisible();
  }

  /**
   * Czeka na zakończenie generowania AI report używając polling strategy
   * (podobnie jak robi to frontend - co 3 sekundy)
   * 
   * @param timeout - maksymalny czas oczekiwania w ms (domyślnie 60 minut)
   */
  async waitForAiReportCompletion(timeout: number = 3600000) {
    const startTime = Date.now();
    const pollInterval = 3000; // 3 sekundy jak na frontendzie
    
    console.log(`⏳ Rozpoczynam oczekiwanie na AI report (max ${timeout/1000}s)...`);
    
    while (true) {
      const elapsed = Date.now() - startTime;
      
      // Sprawdź czy nie przekroczono timeoutu
      if (elapsed > timeout) {
        throw new Error(`Timeout: AI report nie został wygenerowany w ciągu ${timeout/1000}s`);
      }
      
      // Sprawdź czy spinner już zniknął (status success lub error)
      const spinner = this.page.locator('p-progressSpinner');
      const isSpinnerVisible = await spinner.isVisible().catch(() => false);
      
      if (!isSpinnerVisible) {
        console.log(`✅ Spinner zniknął po ${elapsed/1000}s`);
        
        // Sprawdź czy jest error message
        const errorMessage = this.page.locator('p-message[severity="error"]');
        const hasError = await errorMessage.isVisible().catch(() => false);
        
        if (hasError) {
          const errorText = await errorMessage.textContent();
          throw new Error(`AI report zakończył się błędem: ${errorText}`);
        }
        
        // Sprawdź czy pojawiły się sekcje z treścią AI (success)
        console.log('🔍 Sprawdzam czy są sekcje AI...');
        await this.expectAiSummaryToBeVisible();
        await this.expectAiRecommendationsToBeVisible();
        
        console.log(`✅ AI report wygenerowany pomyślnie w ${elapsed/1000}s`);
        return;
      }
      
      // Loguj co 30s aby pokazać że test nadal działa
      if (elapsed % 30000 < pollInterval) {
        console.log(`⏳ Oczekiwanie na AI report: ${Math.floor(elapsed/1000)}s / ${timeout/1000}s`);
      }
      
      // Czekaj przed kolejną próbą
      await this.page.waitForTimeout(pollInterval);
    }
  }

  /**
   * Udostępnia mecz i zwraca link publiczny
   */
  async shareMatch(): Promise<string> {
    await this.shareButton.click();

    // Czekaj na pojawienie się dialogu
    const dialog = this.page.getByRole('dialog', { name: 'Udostępnij mecz' });
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Czekaj aż spinner zniknie (jeśli link jest generowany)
    const spinner = dialog.locator('.pi-spinner');
    await expect(spinner).not.toBeVisible({ timeout: 10000 }).catch(() => {
      // Spinner może nie być widoczny jeśli link był już wygenerowany
    });

    // Pobierz link z input readonly
    const shareLink = this.page.locator('input.url-input[readonly]');
    await expect(shareLink).toBeVisible({ timeout: 5000 });

    const linkValue = await shareLink.inputValue();
    expect(linkValue).toMatch(/\/public\/matches\//);

    return linkValue;
  }

  /**
   * Wraca do listy meczów
   */
  async backToMatches() {
    await this.backToMatchesButton.click();
    await this.page.waitForURL('/matches', { timeout: 5000 });
  }

  /**
   * Sprawdza czy przycisk udostępniania jest dostępny
   */
  async expectShareButtonToBeEnabled() {
    await expect(this.shareButton).toBeEnabled();
  }
}