/**
 * OpenRouter Message Builder
 * Buduje wiadomości dla API OpenRouter zgodnie z promptem Spin Flow
 */

import type {
  OpenRouterMessage,
  MatchData,
  Logger,
} from './openrouter.types';

/**
 * Default logger implementation using console
 */
const defaultLogger: Logger = {
  debug: (message: string, meta?: Record<string, unknown>) => console.debug(`[OpenRouter-Messages] ${message}`, meta),
  info: (message: string, meta?: Record<string, unknown>) => console.info(`[OpenRouter-Messages] ${message}`, meta),
  warn: (message: string, meta?: Record<string, unknown>) => console.warn(`[OpenRouter-Messages] ${message}`, meta),
  error: (message: string, meta?: Record<string, unknown>) => console.error(`[OpenRouter-Messages] ${message}`, meta),
};

/**
 * Message Builder for OpenRouter API
 * Tworzy strukturalne wiadomości zgodnie z wymaganiami prompta Spin Flow
 */
export class MessageBuilder {
  private logger: Logger;

  constructor(logger: Logger = defaultLogger) {
    this.logger = logger;
  }

  /**
   * Buduje kompletny zestaw wiadomości dla analizy meczu
   */
  buildMatchAnalysisMessages(matchData: MatchData): OpenRouterMessage[] {
    return [
      {
        role: 'system',
        content: this.buildSystemMessage(),
      },
      {
        role: 'user',
        content: this.buildUserMessage(matchData),
      },
    ];
  }

  /**
   * Buduje kompletny zestaw wiadomości dla generowania planu treningowego
   */
  buildTrainingPlanMessages(trainingData: Record<string, unknown>): OpenRouterMessage[] {
    return [
      {
        role: 'system',
        content: this.buildTrainingSystemMessage(),
      },
      {
        role: 'user',
        content: this.buildTrainingUserMessage(trainingData),
      },
    ];
  }

  /**
   * Buduje wiadomość systemową dla analizy meczu zgodnie z dokładnym promptem Spin Flow
   */
  private buildSystemMessage(): string {
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

  /**
   * Buduje wiadomość systemową dla planów treningowych
   */
  private buildTrainingSystemMessage(): string {
    return `Jesteś specjalistą ds. treningu tenisa stołowego.

Na podstawie analizy meczów gracza oraz jego poziomu umiejętności, twórz spersonalizowane plany treningowe.

Plany powinny być:
- Realistyczne i osiągalne
- Skupione na słabych punktach zidentyfikowanych w meczach
- Strukturalne z podziałem na etapy
- Zawierać konkretne ćwiczenia i techniki

Odpowiedz w formacie JSON z następującymi polami:
- plan: string z opisem planu treningowego
- duration: string z sugerowanym czasem trwania planu
- focus_areas: array[string] z głównymi obszarami do pracy`;
  }

  /**
   * Buduje wiadomość użytkownika z danymi meczu w czystym formacie JSON
   */
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
          tags: point.tags,
        })),
      })),
    };

    // Zwróć czysty JSON bez dodatkowego tekstu
    return JSON.stringify(matchJson, null, 2);
  }

  /**
   * Buduje wiadomość użytkownika dla planów treningowych
   */
  private buildTrainingUserMessage(trainingData: Record<string, unknown>): string {
    // Placeholder - implementacja zostanie dodana gdy będzie potrzebna
    return JSON.stringify(trainingData, null, 2);
  }

  /**
   * Waliduje strukturę danych meczu przed budowaniem wiadomości
   */
  validateMatchData(matchData: MatchData): boolean {
    try {
      // Sprawdź obecność wymaganych pól
      if (!matchData.matchId || typeof matchData.matchId !== 'number') {
        throw new Error('Invalid matchId');
      }

      if (!matchData.playerName || typeof matchData.playerName !== 'string') {
        throw new Error('Invalid playerName');
      }

      if (!matchData.opponentName || typeof matchData.opponentName !== 'string') {
        throw new Error('Invalid opponentName');
      }

      if (!Array.isArray(matchData.sets) || matchData.sets.length === 0) {
        throw new Error('Invalid sets array');
      }

      // Sprawdź każdy set
      for (const set of matchData.sets) {
        if (typeof set.sequenceInMatch !== 'number' ||
            typeof set.scorePlayer !== 'number' ||
            typeof set.scoreOpponent !== 'number') {
          throw new Error('Invalid set data');
        }

        if (!Array.isArray(set.points)) {
          throw new Error('Invalid points array');
        }

        // Sprawdź każdy punkt
        for (const point of set.points) {
          if (typeof point.sequenceInSet !== 'number' ||
              !['player', 'opponent'].includes(point.scoredBy) ||
              !Array.isArray(point.tags)) {
            throw new Error('Invalid point data');
          }
        }
      }

      this.logger.debug('Match data validation passed', {
        matchId: matchData.matchId,
        setsCount: matchData.sets.length,
        totalPoints: matchData.sets.reduce((sum, set) => sum + set.points.length, 0),
      });

      return true;

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Match data validation failed', {
        error: errorObj.message,
        matchId: matchData.matchId,
      });
      return false;
    }
  }

  /**
   * Szacuje koszt tokenów dla wiadomości (przybliżony)
   */
  estimateTokenCost(messages: OpenRouterMessage[]): number {
    const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);

    // Przybliżone przeliczenie: 1 token ≈ 4 znaki dla polskiego tekstu
    // To jest bardzo przybliżone - w rzeczywistości zależy od modelu
    const estimatedTokens = Math.ceil(totalChars / 4);

    this.logger.debug('Estimated token cost', {
      totalChars,
      estimatedTokens,
    });

    return estimatedTokens;
  }

  /**
   * Tworzy podsumowanie wiadomości dla logowania
   */
  getMessageSummary(messages: OpenRouterMessage[]): {
    messageCount: number;
    roles: string[];
    contentLengths: number[];
    totalLength: number;
  } {
    return {
      messageCount: messages.length,
      roles: messages.map(msg => msg.role),
      contentLengths: messages.map(msg => msg.content.length),
      totalLength: messages.reduce((sum, msg) => sum + msg.content.length, 0),
    };
  }
}
