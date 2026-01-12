import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object Model dla strony tworzenia nowego meczu
 */
export class CreateMatchPage {
  readonly page: Page;
  readonly playerNameInput: Locator;
  readonly opponentNameInput: Locator;
  readonly maxSetsSelect: Locator;
  readonly goldenSetEnabledCheckbox: Locator;
  readonly firstServerSelect: Locator;
  readonly generateAiSummaryCheckbox: Locator;
  readonly createMatchButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form inputs (step 1)
    this.playerNameInput = page.locator('#player_name');
    this.opponentNameInput = page.locator('#opponent_name');

    // Form inputs (step 3)
    this.maxSetsSelect = page.locator('#max_sets');
    this.goldenSetEnabledCheckbox = page.locator('#golden_set');
    this.generateAiSummaryCheckbox = page.locator('#ai_summary');

    // Action buttons
    this.createMatchButton = page.locator('p-button:has-text("Utwórz mecz")');
    this.cancelButton = page.locator('[data-testid="cancel-create"]');
  }

  /**
   * Nawiguje do strony tworzenia meczu
   */
  async goto() {
    await this.page.goto('/matches/new');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Sprawdza czy strona została załadowana
   */
  async expectToBeLoaded() {
    await expect(this.page.locator('h1:has-text("Nowy mecz")')).toBeVisible();
  }

  /**
   * Wypełnia krok 1: dane zawodników
   */
  async fillStep1(playerName: string, opponentName: string) {
    await this.playerNameInput.fill(playerName);
    await this.opponentNameInput.fill(opponentName);

    // Przejdź do następnego kroku
    await this.page.locator('p-button:has-text("Dalej")').first().click();
  }

  /**
   * Wypełnia krok 2: wybór serwującego
   */
  async fillStep2(firstServer: 'player' | 'opponent') {
    // Znajdź przycisk serwującego
    const serverButton = this.page.locator(`button[aria-label*="${firstServer === 'player' ? 'zawodnika' : 'rywala'}"]`);
    await serverButton.click();

    // Przejdź do następnego kroku
    await this.page.locator('p-button:has-text("Dalej")').last().click();
  }

  /**
   * Wypełnia krok 3: opcje meczu
   */
  async fillStep3(data: {
    maxSets?: number;
    goldenSetEnabled?: boolean;
    generateAiSummary?: boolean;
  }) {
    if (data.maxSets) {
      await this.maxSetsSelect.click();
      await this.page.waitForTimeout(500); // Wait for dropdown to open
      await this.page.getByRole('option', { name: data.maxSets.toString() }).click();
    }

    if (data.goldenSetEnabled !== undefined) {
      const toggle = this.page.locator('#golden_set');
      const isChecked = await toggle.isChecked();
      if (data.goldenSetEnabled && !isChecked) {
        await toggle.click();
      } else if (!data.goldenSetEnabled && isChecked) {
        await toggle.click();
      }
    }

    if (data.generateAiSummary !== undefined) {
      const toggle = this.page.locator('#ai_summary');
      const isChecked = await toggle.isChecked();
      if (data.generateAiSummary && !isChecked) {
        await toggle.click();
      } else if (!data.generateAiSummary && isChecked) {
        await toggle.click();
      }
    }
  }

  /**
   * Tworzy mecz i czeka na przekierowanie
   */
  async createMatch(data: {
    playerName: string;
    opponentName: string;
    maxSets?: number;
    goldenSetEnabled?: boolean;
    firstServer?: 'player' | 'opponent';
    generateAiSummary?: boolean;
  }) {
    // Krok 1: zawodnicy
    await this.fillStep1(data.playerName, data.opponentName);

    // Krok 2: serwujący
    await this.fillStep2(data.firstServer || 'player');

    // Krok 3: opcje
    await this.fillStep3({
      maxSets: data.maxSets,
      goldenSetEnabled: data.goldenSetEnabled,
      generateAiSummary: data.generateAiSummary,
    });

    // Utwórz mecz
    await this.createMatchButton.click();

    // Czekaj na przekierowanie do strony meczu na żywo
    await this.page.waitForURL(/\/matches\/\d+\/live/, { timeout: 10000 });
  }

  /**
   * Tworzy mecz z domyślnymi wartościami dla testów
   */
  async createDefaultMatch() {
    await this.createMatch({
      playerName: 'Test Player',
      opponentName: 'Test Opponent',
      maxSets: 3,
      goldenSetEnabled: false,
      firstServer: 'player',
      generateAiSummary: true,
    });
  }

  /**
   * Anuluje tworzenie meczu
   */
  async cancel() {
    await this.cancelButton.click();
    await this.page.waitForURL('/matches', { timeout: 5000 });
  }

  /**
   * Sprawdza czy przycisk tworzenia jest dostępny
   */
  async expectCreateButtonToBeEnabled() {
    await expect(this.createMatchButton).toBeEnabled();
  }

  /**
   * Sprawdza walidację formularza
   */
  async expectValidationError(field: string, message: string) {
    const errorLocator = this.page.locator(`[data-testid="${field}-error"]`);
    await expect(errorLocator).toContainText(message);
  }
}