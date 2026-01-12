import { test, expect } from './fixtures/auth.fixture';
import { CreateMatchPage } from './pages/create-match.page';
import { LiveMatchPage } from './pages/live-match.page';
import { MatchSummaryPage } from './pages/match-summary.page';

/**
 * Test E2E dla pełnego flow meczu z AI
 *
 * Autentykacja: Prawdziwy użytkownik testowy z bazy danych
 * - Użytkownik: TEST_USER_ID z .env (prawdziwy UUID)
 * - Email: TEST_USER_EMAIL z .env
 *
 * Setup & Teardown:
 * - Teardown: Po zakończeniu wszystkich testów czyszczenie danych testowych
 *   (mechanizm Playwright teardown w playwright.config.ts)
 * - Test używa prawdziwej bazy danych (lokalna lub testowa)
 *
 * Scenariusz:
 * 1. Utworzenie nowego meczu (kreator)
 * 2. Rejestracja punktów w czasie rzeczywistym (3 sety, wynik 5:3 w każdym)
 * 3. Zakończenie meczu
 * 4. Oczekiwanie na raport AI
 * 5. Udostępnienie meczu publicznie
 * 6. Weryfikacja linku publicznego
 */

test.describe('Full Match Flow with AI', () => {
  let createMatchPage: CreateMatchPage;
  let liveMatchPage: LiveMatchPage;
  let matchSummaryPage: MatchSummaryPage;
  let matchId: number;
  let publicLink: string;

  test.beforeEach(async ({ page }) => {
    // Initialize Page Objects
    createMatchPage = new CreateMatchPage(page);
    liveMatchPage = new LiveMatchPage(page);
    matchSummaryPage = new MatchSummaryPage(page);
  });

  test('powinien zrealizować pełny flow meczu z AI', async ({ page, context }) => {
    // Zwiększ timeout dla tego testu - AI może generować się do 60 minut
    test.setTimeout(3700000); // 61 minut (60 min AI + 1 min buffer)

    // === KROK 1: Utworzenie nowego meczu ===
    await test.step('Utworzenie nowego meczu', async () => {
      await createMatchPage.goto();
      await createMatchPage.expectToBeLoaded();

      await createMatchPage.createDefaultMatch();

      // Wyciągnij ID meczu z URL
      const urlMatch = page.url().match(/\/matches\/(\d+)\/live/);
      expect(urlMatch).toBeTruthy();
      expect(urlMatch?.[1]).toBeDefined();
      matchId = parseInt(urlMatch[1]);
      // eslint-disable-next-line no-console
      console.log(`✅ Mecz utworzony, ID: ${matchId}`);
    });

    // === KROK 2: Rejestracja pierwszego seta (5:3 dla gracza) ===
    await test.step('Rejestracja pierwszego seta - Gracz wygrywa 5:3', async () => {
      await liveMatchPage.expectToBeLoaded();
      await liveMatchPage.expectScore(0, 0);
      await liveMatchPage.expectSetNumber(1);

      // Gracz wygrywa 5 punktów
      for (let i = 0; i < 5; i++) {
        await liveMatchPage.scorePointForPlayer();
      }

      // Przeciwnik wygrywa 3 punkty
      for (let i = 0; i < 3; i++) {
        await liveMatchPage.scorePointForOpponent();
      }

      await liveMatchPage.expectScore(5, 3);
      await liveMatchPage.expectFinishSetButtonToBeEnabled();

      // Zakończ pierwszy set z notatkami
      await liveMatchPage.finishSet('Dobry początek, ale trzeba poprawić serwisy');
      // eslint-disable-next-line no-console
      console.log('✅ Set 1 zakończony: 5:3 dla gracza');

      // Sprawdź czy przeszliśmy do drugiego seta
      await liveMatchPage.expectSetNumber(2);
      await liveMatchPage.expectScore(0, 0);
    });

    // === KROK 3: Rejestracja drugiego seta (5:3 dla przeciwnika) ===
    await test.step('Rejestracja drugiego seta - Przeciwnik wygrywa 5:3', async () => {
      // Przeciwnik wygrywa 5 punktów
      for (let i = 0; i < 5; i++) {
        await liveMatchPage.scorePointForOpponent();
      }

      // Gracz wygrywa 3 punkty
      for (let i = 0; i < 3; i++) {
        await liveMatchPage.scorePointForPlayer();
      }

      await liveMatchPage.expectScore(3, 5);
      await liveMatchPage.expectFinishSetButtonToBeEnabled();

      // Zakończ drugi set
      await liveMatchPage.finishSet('Trzeba poprawić koncentrację w kluczowych momentach');
      // eslint-disable-next-line no-console
      console.log('✅ Set 2 zakończony: 3:5 dla przeciwnika');

      // Sprawdź czy przeszliśmy do trzeciego seta
      await liveMatchPage.expectSetNumber(3);
      await liveMatchPage.expectScore(0, 0);
    });

    // === KROK 4: Rejestracja trzeciego seta (decydującego, 5:3 dla gracza) ===
    await test.step('Rejestracja trzeciego seta - Gracz wygrywa 5:3', async () => {
      // Gracz wygrywa 5 punktów
      for (let i = 0; i < 5; i++) {
        await liveMatchPage.scorePointForPlayer();
      }

      // Przeciwnik wygrywa 3 punkty
      for (let i = 0; i < 3; i++) {
        await liveMatchPage.scorePointForOpponent();
      }

      await liveMatchPage.expectScore(5, 3);
      await liveMatchPage.expectFinishMatchButtonToBeEnabled();

      // Zakończ mecz
      await liveMatchPage.finishMatch('Ogólnie dobry mecz, sporo pozytywów do kontynuowania');
      // eslint-disable-next-line no-console
      console.log('✅ Set 3 zakończony: 5:3 dla gracza. Mecz zakończony!');
    });

    // === KROK 5: Sprawdź podsumowanie i czekaj na AI ===
    await test.step('Weryfikacja podsumowania meczu i raportu AI', async () => {
      await liveMatchPage.waitForRedirectToSummary();

      await matchSummaryPage.expectToBeLoaded();
      await matchSummaryPage.expectMatchTitle('Test Player', 'Test Opponent');
      await matchSummaryPage.expectFinalScore(2, 1); // 2:1

      // Sprawdź czy AI report się generuje
      await matchSummaryPage.expectAiStatus('pending');
      // eslint-disable-next-line no-console
      console.log('⏳ Oczekiwanie na raport AI (max 60 minut)...');

      // Czekaj na zakończenie generowania AI report (timeout 60 minut)
      // AI używa OpenRouter i może generować się bardzo długo
      await matchSummaryPage.waitForAiReportCompletion(3600000); // 60 minut

      // Sprawdź czy AI report zawiera treści
      await matchSummaryPage.expectAiSummaryToBeVisible();
      await matchSummaryPage.expectAiRecommendationsToBeVisible();
      // eslint-disable-next-line no-console
      console.log('✅ Raport AI wygenerowany');
    });

    // === KROK 6: Udostępnij mecz publicznie ===
    await test.step('Udostępnienie meczu publicznie', async () => {
      publicLink = await matchSummaryPage.shareMatch();
      expect(publicLink).toBeTruthy();
      // eslint-disable-next-line no-console
      console.log(`✅ Link publiczny wygenerowany: ${publicLink}`);
    });

    // === KROK 7: Sprawdź widok publiczny ===
    await test.step('Weryfikacja widoku publicznego', async () => {
      // Otwórz link publiczny w nowej karcie (symulacja użytkownika bez logowania)
      const newPage = await context.newPage();

      // Dodaj header x-test-mode:true również dla nowej karty, aby działał dostęp do bazy
      await newPage.setExtraHTTPHeaders({
        'x-test-mode': 'true',
      });

      // eslint-disable-next-line no-console
      console.log(`📂 Nawiguję do publicznego URL: ${publicLink}`);
      await newPage.goto(publicLink);
      await newPage.waitForLoadState('networkidle');

      // eslint-disable-next-line no-console
      console.log(`📍 Aktualna strona: ${newPage.url()}`);

      // Sprawdź czy publiczny widok działa (bez logowania)
      // Używamy tych samych selektorów co w summary page - widok publiczny używa tych samych komponentów
      const matchHeader = newPage.locator('.match-header-card');
      await expect(matchHeader).toBeVisible({ timeout: 10000 });
      await expect(matchHeader).toContainText('Test Player');
      await expect(matchHeader).toContainText('Test Opponent');

      // Sprawdź wynik setowy
      const playerBadge = newPage.locator('.sets-won-badge.player-badge');
      await expect(playerBadge).toHaveText('2');

      const opponentBadge = newPage.locator('.sets-won-badge.opponent-badge');
      await expect(opponentBadge).toHaveText('1');

      // Sprawdź czy AI report jest widoczny publicznie
      const aiReportPanel = newPage.locator('p-panel').filter({ hasText: 'Analiza AI' });
      await expect(aiReportPanel).toBeVisible({ timeout: 5000 });

      // Sprawdź czy są sekcje z opisem i zaleceniami
      const aiSummaryHeading = newPage.locator('h3').filter({ hasText: 'Opis meczu' });
      await expect(aiSummaryHeading).toBeVisible();

      const aiRecommendationsHeading = newPage.locator('h3').filter({ hasText: 'Zalecenia treningowe' });
      await expect(aiRecommendationsHeading).toBeVisible();

      // eslint-disable-next-line no-console
      console.log('✅ Widok publiczny działa poprawnie');
      await newPage.close();
    });
  });

  test('powinien obsługiwać cofanie punktów', async ({ page }) => {
    // === Przygotowanie: Utwórz mecz ===
    await test.step('Utworzenie meczu testowego', async () => {
      await createMatchPage.goto();
      await createMatchPage.createDefaultMatch();

      const urlMatch = page.url().match(/\/matches\/(\d+)\/live/);
      expect(urlMatch).toBeTruthy();
      expect(urlMatch?.[1]).toBeDefined();
      const testMatchId = parseInt(urlMatch[1]);
      // eslint-disable-next-line no-console
      console.log(`✅ Mecz testowy utworzony, ID: ${testMatchId}`);
    });

    // === Test cofania punktów ===
    await test.step('Cofanie punktów i walidacja', async () => {
      await liveMatchPage.expectToBeLoaded();
      await liveMatchPage.expectScore(0, 0);

      // Dodaj kilka punktów
      await liveMatchPage.scorePointForPlayer();
      await liveMatchPage.scorePointForPlayer();
      await liveMatchPage.scorePointForOpponent();
      await liveMatchPage.expectScore(2, 1);
      // eslint-disable-next-line no-console
      console.log('✅ Dodano punkty: 2:1');

      // Sprawdź czy przycisk cofania jest dostępny
      await liveMatchPage.expectUndoButtonToBeEnabled();

      // Cofnij ostatni punkt
      await liveMatchPage.undoLastPoint();
      await liveMatchPage.expectScore(2, 0);
      // eslint-disable-next-line no-console
      console.log('✅ Cofnięto punkt: 2:0');

      // Cofnij jeszcze jeden punkt
      await liveMatchPage.undoLastPoint();
      await liveMatchPage.expectScore(1, 0);
      // eslint-disable-next-line no-console
      console.log('✅ Cofnięto punkt: 1:0');

      // Dodaj punkt dla przeciwnika i sprawdź remis (nie można zakończyć meczu)
      await liveMatchPage.scorePointForOpponent();
      await liveMatchPage.expectScore(1, 1);

      // Sprawdź czy przycisk zakończenia seta nie jest dostępny (remis)
      // W remisie 1:1 przycisk finish set powinien być disabled
      await liveMatchPage.expectFinishSetButtonToBeDisabled();
      // eslint-disable-next-line no-console
      console.log('✅ Walidacja remisu działa - przycisk zakończenia seta wyłączony');
    });
  });
});
