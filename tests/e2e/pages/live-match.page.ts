/* eslint-disable no-console */
import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla strony meczu na żywo
 */
export class LiveMatchPage {
  readonly page: Page;
  readonly playerScore: Locator;
  readonly opponentScore: Locator;
  readonly setNumber: Locator;
  readonly playerScoreButton: Locator;
  readonly opponentScoreButton: Locator;
  readonly undoButton: Locator;
  readonly finishSetButton: Locator;
  readonly finishMatchButton: Locator;
  readonly coachNotes: Locator;

  constructor(page: Page) {
    this.page = page;

    // Score display - znajdź po klasach CSS
    this.playerScore = page.locator('.player-column .score-value').first();
    this.opponentScore = page.locator('.opponent-column .score-value').first();
    this.setNumber = page.locator('.set-title');

    // Action buttons
    this.playerScoreButton = page.locator('.scoring-button.player-button');
    this.opponentScoreButton = page.locator('.scoring-button.opponent-button');
    this.undoButton = page.locator('.control-button.undo-button');
    this.finishSetButton = page.locator('.control-button.finish-set-button');
    this.finishMatchButton = page.locator('.control-button.finish-match-button');

    // Coach notes - nie używane w tej wersji
    this.coachNotes = page.locator('[data-testid="coach-notes"]');
  }

  /**
   * Nawiguje do strony meczu na żywo
   */
  async goto(matchId: number) {
    await this.page.goto(`/matches/${matchId}/live`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sprawdza czy strona została załadowana
   */
  async expectToBeLoaded() {
    await expect(this.page.locator('.live-match-content')).toBeVisible();
    await expect(this.playerScore).toBeVisible();
    await expect(this.opponentScore).toBeVisible();
  }

  /**
   * Sprawdza wynik
   */
  async expectScore(playerScore: number, opponentScore: number) {
    await expect(this.playerScore).toHaveText(playerScore.toString());
    await expect(this.opponentScore).toHaveText(opponentScore.toString());
  }

  /**
   * Sprawdza numer seta
   */
  async expectSetNumber(setNumber: number) {
    await expect(this.setNumber).toHaveText(`Set ${setNumber}`);
  }

  /**
   * Dodaje punkt dla gracza
   */
  async scorePointForPlayer() {
    // Debug: sprawdź czy przycisk istnieje
    const buttonCount = await this.playerScoreButton.count();
    console.log(`Player score button count: ${buttonCount}`);

    if (buttonCount === 0) {
      throw new Error('Player score button not found');
    }

    // Sprawdź czy przycisk jest widoczny
    const isVisible = await this.playerScoreButton.isVisible();
    console.log(`Player score button visible: ${isVisible}`);

    if (!isVisible) {
      throw new Error('Player score button not visible');
    }

    // Sprawdź czy przycisk jest dostępny
    const isEnabled = await this.playerScoreButton.isEnabled();
    console.log(`Player score button enabled: ${isEnabled}`);

    await this.playerScoreButton.click();

    // Zamiast waitForLoadState, czekaj na aktualizację DOM
    await this.page.waitForTimeout(200); // Krótkie czekanie na Angular change detection
  }

  /**
   * Dodaje punkt dla przeciwnika
   */
  async scorePointForOpponent() {
    // Debug: sprawdź czy przycisk istnieje
    const buttonCount = await this.opponentScoreButton.count();
    console.log(`Opponent score button count: ${buttonCount}`);

    if (buttonCount === 0) {
      throw new Error('Opponent score button not found');
    }

    // Sprawdź czy przycisk jest widoczny
    const isVisible = await this.opponentScoreButton.isVisible();
    console.log(`Opponent score button visible: ${isVisible}`);

    if (!isVisible) {
      throw new Error('Opponent score button not visible');
    }

    // Sprawdź czy przycisk jest dostępny
    const isEnabled = await this.opponentScoreButton.isEnabled();
    console.log(`Opponent score button enabled: ${isEnabled}`);

    await this.opponentScoreButton.click();

    // Zamiast waitForLoadState, czekaj na aktualizację DOM
    await this.page.waitForTimeout(200); // Krótkie czekanie na Angular change detection
  }

  /**
   * Cofa ostatni punkt
   */
  async undoLastPoint() {
    await this.undoButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Kończy seta
   */
  async finishSet(notes?: string) {
    // Kliknij przycisk "Zakończ set"
    await this.finishSetButton.click();

    // Czekaj na pojawienie się dialogu (używamy role="dialog")
    const dialog = this.page.getByRole('dialog', { name: new RegExp('Zakończ set') });
    await expect(dialog).toBeVisible({ timeout: 3000 });

    // Jeśli są notatki, wypełnij pole
    if (notes) {
      const notesInput = this.page.locator('#coach-notes');
      await expect(notesInput).toBeVisible({ timeout: 2000 });
      await notesInput.fill(notes);
    }

    // Kliknij przycisk "Zapisz" w dialogu
    const confirmButton = this.page.getByRole('button', { name: 'Zapisz', exact: true });
    await expect(confirmButton).toBeVisible({ timeout: 2000 });
    await expect(confirmButton).toBeEnabled({ timeout: 1000 });
    
    // Zacznij czekać na odpowiedź API PRZED kliknięciem
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/sets/') && response.url().includes('/finish'),
      { timeout: 10000 },
    );
    
    await confirmButton.click();
    
    // Czekaj na odpowiedź API
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    // Czekaj na zamknięcie dialogu
    await expect(dialog).not.toBeVisible({ timeout: 3000 });

    // Czekaj aż wynik się wyzeruje (oznaka nowego seta)
    await expect(this.playerScore).toHaveText('0', { timeout: 5000 });
    await expect(this.opponentScore).toHaveText('0', { timeout: 2000 });
  }

  /**
   * Kończy mecz
   */
  async finishMatch(notes?: string) {
    console.log('🎯 Klikam przycisk zakończ mecz...');
    await this.finishMatchButton.click();

    // Czekaj na pojawienie się dialogu (używamy role="dialog")
    const dialog = this.page.getByRole('dialog', { name: /Zakończ mecz/ });
    await expect(dialog).toBeVisible({ timeout: 3000 });
    console.log('✅ Dialog zakończenia meczu jest widoczny');

    // Jeśli są notatki, wypełnij pole
    if (notes) {
      console.log('📝 Wypełniam notatki...');
      const notesInput = this.page.locator('#coach-notes-match');
      await expect(notesInput).toBeVisible({ timeout: 2000 });
      await notesInput.fill(notes);
    }

    // Kliknij przycisk "Zakończ mecz" w dialogu (second button with that text - the one in dialog footer)
    console.log('✅ Szukam przycisku potwierdzenia...');
    const confirmButton = this.page.getByRole('button', { name: 'Zakończ mecz', exact: true }).last();
    await expect(confirmButton).toBeVisible({ timeout: 3000 });
    await expect(confirmButton).toBeEnabled({ timeout: 1000 });
    
    console.log('✅ Klikam przycisk potwierdzenia...');
    
    // Zacznij czekać na odpowiedź API PRZED kliknięciem
    const responsePromise = this.page.waitForResponse(
      (response) => response.url().includes('/api/matches/') && response.url().includes('/finish'),
      { timeout: 10000 },
    );
    
    await confirmButton.click();

    // Czekaj na odpowiedź API
    console.log('⏳ Czekam na odpowiedź API...');
    const response = await responsePromise;
    expect(response.status()).toBe(200);

    console.log('✅ finishMatch() zakończony - API zwróciło sukces');
  }

  /**
   * Sprawdza czy przycisk cofania jest dostępny
   */
  async expectUndoButtonToBeEnabled() {
    await expect(this.undoButton).toBeEnabled();
  }

  /**
   * Sprawdza czy przycisk kończenia seta jest dostępny
   */
  async expectFinishSetButtonToBeEnabled() {
    await expect(this.finishSetButton).toBeEnabled();
  }

  /**
   * Sprawdza czy przycisk kończenia seta jest wyłączony (disabled)
   */
  async expectFinishSetButtonToBeDisabled() {
    await expect(this.finishSetButton).toBeDisabled();
  }

  /**
   * Sprawdza czy przycisk kończenia meczu jest dostępny
   */
  async expectFinishMatchButtonToBeEnabled() {
    await expect(this.finishMatchButton).toBeEnabled();
  }

  /**
   * Czeka na przekierowanie do podsumowania
   */
  async waitForRedirectToSummary() {
    await this.page.waitForURL(/\/matches\/\d+\/summary/, { timeout: 10000 });
  }

  /**
   * Sprawdza czy AI report jest generowany
   */
  async expectAiReportToBeGenerating() {
    const aiStatus = this.page.locator('[data-testid="ai-status"]');
    await expect(aiStatus).toContainText('generating');
  }
}