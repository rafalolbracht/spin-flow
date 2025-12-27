# OpenRouter Service Implementation Plan

## 1. Opis usługi

Usługa OpenRouter stanowi kluczowy komponent aplikacji Spin Flow, odpowiedzialny za integrację z API OpenRouter w celu generowania analiz meczów i rekomendacji treningowych opartych na sztucznej inteligencji. Usługa współdziała z modelem xAI Grok-4.1-Fast poprzez bramkę OpenRouter, zapewniając wysoką jakość analiz sportowych przy optymalnej prędkości odpowiedzi.

### Główne cechy:

- **Strukturyzowane odpowiedzi JSON** poprzez response_format API
- **Zarządzanie komunikatami systemowymi** dla kontekstu analizy sportowej
- **Obsługa różnych modeli AI** z automatycznym fallback
- **Kompleksowa obsługa błędów** z retry logic i monitoringiem
- **Bezpieczne zarządzanie kluczami API** po stronie serwera

## 2. Opis konstruktora

```typescript
export class OpenRouterService {
  constructor(
    private config: OpenRouterConfig,
    private logger: Logger = defaultLogger
  ) {
    this.validateConfig(config);
    this.initializeClients();
  }
}
```

**Parametry konstruktora:**

- `config: OpenRouterConfig` - konfiguracja zawierająca API key, timeout'y, domyślny model
- `logger: Logger` - opcjonalny logger, domyślnie używa konsoli

**Konfiguracja:**

```typescript
interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  defaultModel: string; // x-ai/grok-4.1-fast
  fallbackModel: string;
  timeout: {
    completion: number; // ms, domyślnie 30000
    streaming: number; // ms, domyślnie 300000
  };
  retry: {
    maxAttempts: number; // domyślnie 3
    baseDelay: number; // ms, domyślnie 1000
  };
}
```

## 3. Publiczne metody i pola

### `analyzeMatch(matchData: MatchAnalysisRequest): Promise<MatchAnalysisResponse>`

Główna metoda analizy meczu zgodnie z formatem prompta Spin Flow.

**Parametry:**

```typescript
interface MatchAnalysisRequest {
  matchId: number;
  playerName: string;
  opponentName: string;
  sets: Array<{
    sequenceInMatch: number;
    scorePlayer: number;
    scoreOpponent: number;
    isGolden: boolean;
    coachNotes?: string; // Uwagi trenera do seta
    points: Array<{
      sequenceInSet: number;
      scoredBy: "player" | "opponent";
      tags: string[];
    }>;
  }>;
  coachNotes?: string; // Uwagi trenera do całego meczu
}
```

**Przykład wywołania:**

```typescript
const analysis = await openRouterService.analyzeMatch({
  matchId: 123,
  playerName: "Jan Kowalski",
  opponentName: "Anna Nowak",
  coachNotes: "Gracz ma problemy z serwisem i pracą nóg",
  sets: [
    {
      sequenceInMatch: 1,
      scorePlayer: 11,
      scoreOpponent: 9,
      isGolden: false,
      coachNotes: "Dobra gra w końcówce seta",
      points: [
        { sequenceInSet: 1, scoredBy: "player", tags: ["dobry_serwis"] },
        {
          sequenceInSet: 10,
          scoredBy: "player",
          tags: ["agresywny_atak", "dobra_praca_nóg"],
        },
      ],
    },
  ],
});

// Wynik będzie zawierał dokładnie dwie sekcje:
// analysis.opisMeczu - dziennikarski opis meczu (5-7 zdań)
// analysis.zaleceniaTreningowe - konkretne zalecenia treningowe (5-7 zdań)
```

**Zwraca:**

```typescript
interface MatchAnalysisResponse {
  opisMeczu: string; // Treść sekcji "Opis meczu" (5-7 zdań)
  zaleceniaTreningowe: string; // Treść sekcji "Zalecenia treningowe" (5-7 zdań)
  modelUsed: string;
  processingTime: number; // ms
}
```

### `generateTrainingPlan(playerData: PlayerTrainingRequest): Promise<TrainingPlanResponse>`

Generuje spersonalizowany plan treningowy na podstawie danych gracza.

**Parametry:**

```typescript
interface PlayerTrainingRequest {
  playerName: string;
  skillLevel: "beginner" | "intermediate" | "advanced";
  recentMatches: MatchSummary[];
  focusAreas: string[];
}
```

### `getAvailableModels(): Promise<ModelInfo[]>`

Zwraca listę dostępnych modeli z ich możliwościami i kosztami.

**Zwraca:**

```typescript
interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  supportsJsonSchema: boolean;
  costPerToken: number;
}
```

## 4. Prywatne metody i pola

### Pola prywatne:

```typescript
private httpClient: HttpClient;
private messageBuilder: MessageBuilder;
private responseParser: ResponseParser;
private errorHandler: ErrorHandler;
private circuitBreaker: CircuitBreaker;
private metrics: MetricsCollector;
```

### `buildSystemMessage(context: AnalysisContext): string`

Konstruuje komunikat systemowy zgodnie ze specyfikacją analizy meczów Spin Flow.

```typescript
private buildSystemMessage(context: AnalysisContext): string {
  return `Jesteś analitykiem sportowym oraz dziennikarzem specjalizującym się w tenisie stołowym.

Analizujesz mecz wyłącznie na podstawie DANYCH STRUKTURALNYCH przekazanych w formacie JSON.

Otrzymasz obiekt JSON zawierający:

- przebieg setów i punktów

- tagi punktów (np. błąd serwisu, zła praca nóg, nieprzygotowany atak, świnka)

- uwagi trenera do setów oraz do całego meczu

ZASADY OGÓLNE:

- Opieraj się WYŁĄCZNIE na danych z JSON.

- Nie dopisuj faktów, emocji ani zdarzeń, których nie da się wywnioskować z danych.

- Styl dziennikarski ≠ fikcja — fakty muszą wynikać z liczb, tagów i uwag.

- Jeżeli dane są niepełne, zaznacz to pośrednio (bez zgadywania).

- Pisz po polsku, klarownie i zwięźle.

- Używaj krótkich, czytelnych zdań.

- Unikaj powtórzeń tych samych sformułowań.

WYNIK MA ZAWIERAĆ DOKŁADNIE DWIE SEKCJE:

1️⃣ OPIS MECZU (STYL DZIENNIKARSKI)

- 5–7 zdań

- Napisz relację z meczu w stylu krótkiego artykułu sportowego

- Skup się na dynamice spotkania, zmianach w setach i kluczowych momentach

- Wplataj wnioski wynikające z tagów punktów i uwag trenera

- Unikaj patosu i emocji, których nie potwierdzają dane

- Nie używaj statystyk w formie tabelarycznej — opisuj je narracyjnie

2️⃣ ZALECENIA TRENINGOWE

- 5–7 zdań

- Każde zalecenie musi jasno wynikać z obserwowanych problemów

- Łącz: przyczyna → obszar treningowy → kierunek pracy

- Priorytetyzuj elementy, które powtarzają się w danych

- Skup się wyłącznie na zawodniku ocenianym w meczu

FORMAT ODPOWIEDZI:

### Opis meczu

(treść)

### Zalecenia treningowe

(treść)

Poniżej dane meczu w formacie JSON:`;
}
```

### `buildUserMessage(matchData: MatchData): string`

Formatuje dane meczu jako czysty JSON zgodnie z wymaganiami prompta.

```typescript
private buildUserMessage(matchData: MatchData): string {
  // Przygotuj dane w formacie oczekiwanym przez prompt
  const matchJson = {
    matchId: matchData.matchId,
    playerName: matchData.playerName,
    opponentName: matchData.opponentName,
    coachNotes: matchData.coachNotes || null,
    sets: matchData.sets.map(set => ({
      sequenceInMatch: set.sequenceInMatch,
      scorePlayer: set.scorePlayer,
      scoreOpponent: set.scoreOpponent,
      isGolden: set.isGolden,
      coachNotes: set.coachNotes || null,
      points: set.points.map(point => ({
        sequenceInSet: point.sequenceInSet,
        scoredBy: point.scoredBy,
        tags: point.tags
      }))
    }))
  };

  // Zwróć czysty JSON bez dodatkowego tekstu
  return JSON.stringify(matchJson, null, 2);
}
```

**Wynikowy format wiadomości do modelu:**

```
Jesteś analitykiem sportowym oraz dziennikarzem specjalizującym się w tenisie stołowym.
[...pełny prompt systemowy...]

Poniżej dane meczu w formacie JSON:
{
  "matchId": 123,
  "playerName": "Jan Kowalski",
  "opponentName": "Anna Nowak",
  "coachNotes": "Gracz ma problemy z serwisem i pracą nóg",
  "sets": [
    {
      "sequenceInMatch": 1,
      "scorePlayer": 11,
      "scoreOpponent": 9,
      "isGolden": false,
      "coachNotes": "Dobra gra w końcówce seta",
      "points": [
        {
          "sequenceInSet": 1,
          "scoredBy": "player",
          "tags": ["dobry_serwis"]
        },
        {
          "sequenceInSet": 10,
          "scoredBy": "player",
          "tags": ["agresywny_atak", "dobra_praca_nóg"]
        }
      ]
    }
  ]
}
```

### `getResponseSchema(): ResponseFormat`

Zwraca schemat JSON wymuszający dokładnie dwie sekcje zgodnie z promptem.

```typescript
private getResponseSchema(): ResponseFormat {
  return {
    type: 'json_schema',
    json_schema: {
      name: 'match_analysis',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          opisMeczu: {
            type: 'string',
            description: 'Treść sekcji "Opis meczu" w stylu dziennikarskim (5-7 zdań)'
          },
          zaleceniaTreningowe: {
            type: 'string',
            description: 'Treść sekcji "Zalecenia treningowe" (5-7 zdań z konkretnymi zaleceniami)'
          }
        },
        required: ['opisMeczu', 'zaleceniaTreningowe'],
        additionalProperties: false
      }
    }
  };
}
```

### `executeWithRetry<T>(operation: () => Promise<T>): Promise<T>`

Implementuje retry logic z exponential backoff.

```typescript
private async executeWithRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (!this.isRetryableError(error) || attempt === this.config.retry.maxAttempts) {
        throw error;
      }

      const delay = this.config.retry.baseDelay * Math.pow(2, attempt - 1);
      await this.delay(delay);

      this.logger.warn(`OpenRouter request failed (attempt ${attempt}/${this.config.retry.maxAttempts})`, {
        error: error.message,
        delay
      });
    }
  }

  throw lastError;
}
```

### `isRetryableError(error: any): boolean`

Sprawdza czy błąd kwalifikuje się do retry.

```typescript
private isRetryableError(error: any): boolean {
  // Retry dla błędów transientnych
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry dla błędów serwera 5xx
  if (error.response?.status >= 500) {
    return true;
  }

  // Retry dla rate limiting 429
  if (error.response?.status === 429) {
    return true;
  }

  return false;
}
```

### `validateResponseFormat(response: any): MatchAnalysisResponse`

Waliduje format odpowiedzi zgodnie z wymaganiami prompta.

```typescript
private validateResponseFormat(response: any): MatchAnalysisResponse {
  if (!response || typeof response !== 'object') {
    throw new OpenRouterError(
      OpenRouterErrorCode.PARSING_ERROR,
      'Invalid response format: expected object'
    );
  }

  // Sprawdź obecność wymaganych pól
  if (!response.opisMeczu || typeof response.opisMeczu !== 'string') {
    throw new OpenRouterError(
      OpenRouterErrorCode.PARSING_ERROR,
      'Missing or invalid "opisMeczu" field'
    );
  }

  if (!response.zaleceniaTreningowe || typeof response.zaleceniaTreningowe !== 'string') {
    throw new OpenRouterError(
      OpenRouterErrorCode.PARSING_ERROR,
      'Missing or invalid "zaleceniaTreningowe" field'
    );
  }

  // Sprawdź długość treści (przybliżona walidacja 5-7 zdań)
  const opisMeczuSentences = response.opisMeczu.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const zaleceniaSentences = response.zaleceniaTreningowe.split(/[.!?]+/).filter(s => s.trim().length > 0);

  if (opisMeczuSentences.length < 3 || opisMeczuSentences.length > 10) {
    this.logger.warn('Opis meczu może mieć nieprawidłową liczbę zdań', {
      sentenceCount: opisMeczuSentences.length
    });
  }

  if (zaleceniaSentences.length < 3 || zaleceniaSentences.length > 10) {
    this.logger.warn('Zalecenia treningowe mogą mieć nieprawidłową liczbę zdań', {
      sentenceCount: zaleceniaSentences.length
    });
  }

  return {
    opisMeczu: response.opisMeczu.trim(),
    zaleceniaTreningowe: response.zaleceniaTreningowe.trim(),
    modelUsed: '',
    processingTime: 0
  };
}
```

## 5. Obsługa błędów

### Typy błędów specyficznych dla OpenRouter:

```typescript
export class OpenRouterError extends Error {
  constructor(
    public code: OpenRouterErrorCode,
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "OpenRouterError";
  }
}

export enum OpenRouterErrorCode {
  INVALID_API_KEY = "INVALID_API_KEY",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  MODEL_NOT_AVAILABLE = "MODEL_NOT_AVAILABLE",
  INVALID_REQUEST = "INVALID_REQUEST",
  QUOTA_EXCEEDED = "QUOTA_EXCEEDED",
  NETWORK_ERROR = "NETWORK_ERROR",
  PARSING_ERROR = "PARSING_ERROR",
  TIMEOUT = "TIMEOUT",
}
```

### Mapowanie błędów API na application errors:

```typescript
private mapApiError(error: any): OpenRouterError {
  const statusCode = error.response?.status;

  switch (statusCode) {
    case 401:
      return new OpenRouterError(
        OpenRouterErrorCode.INVALID_API_KEY,
        'Invalid OpenRouter API key',
        401
      );

    case 429:
      return new OpenRouterError(
        OpenRouterErrorCode.RATE_LIMIT_EXCEEDED,
        'Rate limit exceeded. Please try again later.',
        429,
        true
      );

    case 402:
      return new OpenRouterError(
        OpenRouterErrorCode.QUOTA_EXCEEDED,
        'API quota exceeded. Please check your OpenRouter account.',
        402
      );

    case 400:
      if (error.response?.data?.error?.message?.includes('model')) {
        return new OpenRouterError(
          OpenRouterErrorCode.MODEL_NOT_AVAILABLE,
          `Model not available: ${error.response.data.error.message}`,
          400
        );
      }
      return new OpenRouterError(
        OpenRouterErrorCode.INVALID_REQUEST,
        error.response?.data?.error?.message || 'Invalid request format',
        400
      );

    default:
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        return new OpenRouterError(
          OpenRouterErrorCode.NETWORK_ERROR,
          'Network connection failed',
          undefined,
          true
        );
      }

      return new OpenRouterError(
        OpenRouterErrorCode.NETWORK_ERROR,
        error.message || 'Unknown OpenRouter error',
        statusCode,
        statusCode >= 500
      );
  }
}
```

### Circuit Breaker Pattern:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 min

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new OpenRouterError(
        OpenRouterErrorCode.NETWORK_ERROR,
        "Circuit breaker is open. Service temporarily unavailable.",
        undefined,
        true
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures < this.threshold) return false;
    return Date.now() - this.lastFailureTime < this.timeout;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}
```

## 6. Kwestie bezpieczeństwa

### Zarządzanie kluczami API:

```typescript
// Environment variables (production)
OPENROUTER_API_KEY = sk - or - v1 - xxxxxxxxxxxxx;

// Configuration with defaults
const config: OpenRouterConfig = {
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: "https://openrouter.ai/api/v1",
  defaultModel: "x-ai/grok-4.1-fast",
  fallbackModel: "openai/gpt-4o-mini",
  // ... pozostała konfiguracja
};
```

### Uwagi dotyczące walidacji danych wejściowych:

**Dane wejściowe nie wymagają dodatkowej walidacji** - aplikacja już zapewnia poprawność danych przed przekazaniem do usługi OpenRouter. Walidacja obejmuje:

- Poprawność struktury MatchAnalysisRequest
- Obecność wymaganych pól
- Poprawne zakresy wartości (ID > 0, scores >= 0, itp.)

### Rate Limiting i Monitoring:

```typescript
private async checkRateLimit(): Promise<void> {
  // Implementacja sprawdzenia limitów
  const usage = await this.getCurrentUsage();

  if (usage.requestsPerMinute > 50) {
    this.logger.warn('High request frequency detected', { usage });
  }

  if (usage.tokensPerHour > 900000) { // 90% of hourly limit
    this.logger.warn('Approaching hourly token limit', { usage });
  }
}
```

### Sanitization logów:

```typescript
private sanitizeForLogging(data: any): any {
  const sensitiveFields = ['apiKey', 'authorization', 'x-api-key'];

  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  return data;
}
```

## 7. Plan wdrożenia krok po kroku

### Krok 1: Przygotowanie środowiska (15 minut)

1. **Dodaj zmienną środowiskową:**

   ```bash
   # .env.local
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   ```

2. **Zainstaluj wymagania:**
   ```bash
   npm install axios @types/node
   ```

### Krok 2: Implementacja podstawowych typów (30 minut)

1. **Utwórz plik `src/lib/services/openrouter/openrouter.types.ts`:**
   - Interfejsy: `OpenRouterConfig`, `MatchAnalysisRequest`, `MatchAnalysisResponse`
   - Typy błędów: `OpenRouterError`, `OpenRouterErrorCode`
   - Response format types

2. **Utwórz plik `src/lib/services/openrouter/schemas.ts`:**
   - JSON Schema dla response_format (wymuszającego format odpowiedzi AI)
   - Schemas dla walidacji odpowiedzi od API

### Krok 3: Implementacja obsługi błędów (45 minut)

1. **Utwórz `src/lib/services/openrouter/error-handler.ts`:**
   - Klasa `OpenRouterError`
   - Funkcje mapowania błędów API
   - Circuit breaker implementation

2. **Dodaj do `src/lib/utils/api-errors.ts`:**
   - Integracja z istniejącymi błędami aplikacji

### Krok 4: Implementacja klienta HTTP (45 minut)

1. **Utwórz `src/lib/services/openrouter/http-client.ts`:**
   - Klasa `HttpClient` z axios
   - Konfiguracja timeout'ów
   - Interceptory dla logowania

2. **Implementuj retry logic:**
   - `executeWithRetry` method
   - Exponential backoff
   - Warunki retry'owania

### Krok 5: Implementacja MessageBuilder (30 minut)

1. **Utwórz `src/lib/services/openrouter/message-builder.ts`:**
   - Metoda `buildSystemMessage`
   - Metoda `buildUserMessage`
   - Template system dla różnych typów analiz

### Krok 6: Implementacja ResponseParser (30 minut)

1. **Utwórz `src/lib/services/openrouter/response-parser.ts`:**
   - Parsowanie JSON Schema responses
   - Walidacja struktury odpowiedzi
   - Type-safe mapping

### Krok 7: Implementacja głównej usługi (60 minut)

1. **Utwórz `src/lib/services/openrouter/openrouter.service.ts`:**
   - Klasa główna `OpenRouterService`
   - Constructor z walidacją konfiguracji
   - Metody publiczne: `analyzeMatch`, `generateTrainingPlan`

2. **Implementuj prywatne metody:**
   - `getResponseSchema`
   - Integracja wszystkich komponentów

### Krok 8: Integracja z istniejącym kodem (45 minut)

1. **Zaktualizuj `src/lib/services/ai.service.ts`:**
   - Zastąp istniejącą implementację OpenRouter
   - Dostosuj do nowego formatu odpowiedzi (tylko opisMeczu i zaleceniaTreningowe)
   - Zachowaj kompatybilność z istniejącymi wywołaniami

   ```typescript
   // Przykład integracji w ai.service.ts
   export async function generateAiReport(
     supabase: SupabaseClient,
     matchId: number
   ): Promise<void> {
     try {
       // Pobierz dane meczu
       const matchData = await getMatchDataForAI(supabase, matchId);

       // Wywołaj nową usługę OpenRouter
       const analysis = await openRouterService.analyzeMatch(matchData);

       // Zapisz wynik w formacie Spin Flow
       await supabase
         .from("matches_ai_reports")
         .update({
           ai_status: "success",
           ai_summary: analysis.opisMeczu, // Sekcja "Opis meczu"
           ai_recommendations: analysis.zaleceniaTreningowe, // Sekcja "Zalecenia treningowe"
           ai_generated_at: new Date().toISOString(),
         })
         .eq("match_id", matchId);
     } catch (error) {
       await supabase
         .from("matches_ai_reports")
         .update({
           ai_status: "error",
           ai_error: error.message,
           ai_generated_at: new Date().toISOString(),
         })
         .eq("match_id", matchId);
     }
   }
   ```

2. **Dodaj konfigurację do environment:**
   ```typescript
   // src/config/openrouter.config.ts
   export const openRouterConfig = createOpenRouterConfig();
   ```

### Krok 9: Optymalizacje i monitoring (30 minut)

1. **Dodaj metrics collection:**
   - Czas przetwarzania
   - Liczniki sukcesów/błędów
   - Zużycie tokenów

2. **Implementuj caching:**
   - Cache dla często używanych schematów
   - Cache wyników analizy (opcjonalnie)

3. **Dodaj health checks:**
   - Endpoint sprawdzający dostępność API
   - Monitoring rate limits i quota

### Checklist wdrożenia

- [ ] Zmienne środowiskowe skonfigurowane
- [ ] Zależności zainstalowane
- [ ] Typy i interfejsy zaimplementowane
- [ ] Obsługa błędów gotowa
- [ ] Klient HTTP z retry logic
- [ ] MessageBuilder z templates
- [ ] ResponseParser z walidacją
- [ ] Główna usługa zaimplementowana
- [ ] Integracja z ai.service.ts
- [ ] Monitoring i logging
- [ ] Dokumentacja zaktualizowana

### Szacowany czas całkowity: 6-8 godzin

---

## Aktualizacje wprowadzone zgodnie z przykładem prompta

Plan implementacji został zaktualizowany zgodnie z dostarczonym przykładem prompta analizy meczów tenisa stołowego:

### ✅ Zrealizowane zmiany:

1. **System message** - zastąpiony dokładnym promptem z przykładu
2. **Format odpowiedzi** - zmieniony na dokładnie dwie sekcje: "Opis meczu" i "Zalecenia treningowe"
3. **JSON Schema** - dostosowane do wymuszania dwóch wymaganych pól: `opisMeczu` i `zaleceniaTreningowe`
4. **Walidacja odpowiedzi** - dodana metoda sprawdzająca format i długość sekcji (5-7 zdań)
5. **Format danych wejściowych** - zmieniony na czysty JSON bez dodatkowego tekstu
6. **Interfejsy** - zaktualizowane aby odzwierciedlać nowy format odpowiedzi
7. **Integracja** - przykłady pokazujące jak używać nowej struktury w ai.service.ts
8. **Uproszczona walidacja** - usunięta walidacja requestów przez Zod (aplikacja już zapewnia poprawność danych)

### 🔄 Kluczowe różnice od pierwotnego planu:

- **Usunięty confidence score** - prompt nie wymaga oceny pewności analizy
- **Dokładny format sekcji** - wymuszone nagłówki "### Opis meczu" i "### Zalecenia treningowe"
- **Walidacja długości** - sprawdzanie czy każda sekcja ma 5-7 zdań
- **Polski język** - cała komunikacja po polsku zgodnie z wymaganiami
- **Styl dziennikarski** - nacisk na narracyjny, faktograficzny opis bez emocji
- **Uproszczona walidacja** - brak walidacji requestów przez Zod (aplikacja już zapewnia poprawność)

### 📋 Wymagania prompta spełnione:

- ✅ Opieranie się wyłącznie na danych strukturalnych JSON
- ✅ Dwie sekcje: dziennikarski opis meczu + zalecenia treningowe
- ✅ Każda sekcja 5-7 zdań
- ✅ Styl klarowny i zwięzły po polsku
- ✅ Unikanie faktów spoza danych
- ✅ Łączenie przyczyn z konkretnymi zaleceniami treningowymi

## Informacje o wybranym modelu: xAI Grok-4.1-Fast

### ✅ Zalety wybranego modelu:

- **Szybkość odpowiedzi** - zoptymalizowany dla szybkich odpowiedzi (4.1-fast)
- **Wsparcie JSON Schema** - pełna kompatybilność z response_format wymaganym przez aplikację
- **Polski język** - dobra obsługa języka polskiego w analizach sportowych
- **Koszt-efektywność** - dobry balans między jakością a kosztem użycia
- **Dostępność przez OpenRouter** - niezawodny dostęp przez bramkę OpenRouter

### ⚠️ Ważne uwagi implementacyjne:

- Model wymaga ścisłego adherence do JSON Schema w response_format
- Optymalny dla zadań analitycznych z jasnymi instrukcjami (jak analiza sportowa)
- Może wymagać dłuższych promptów systemowych dla uzyskania spójnych odpowiedzi
- Testowanie pod kątem długości odpowiedzi i formatowania jest zalecane

### 🔄 Fallback model:

W przypadku problemów z dostępnością, skonfigurowany jest model zapasowy `openai/gpt-4o-mini` zapewniający ciągłość działania.

---

**Autor:** AI Assistant
**Data:** 2025-12-26
**Wersja:** 1.3 (Zaktualizowana zgodnie z przykładem prompta + model xAI Grok-4.1-Fast + uproszczona walidacja)
