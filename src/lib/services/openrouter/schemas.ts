/**
 * OpenRouter Schemas
 * Zawiera JSON Schema dla walidacji odpowiedzi i formatowania requestów
 */

import type { ResponseFormat } from './openrouter.types';

/**
 * JSON Schema wymuszające dokładnie dwie sekcje zgodnie z promptem Spin Flow
 * Odpowiedź musi zawierać dokładnie dwie sekcje: opisMeczu i zaleceniaTreningowe
 */
export function getMatchAnalysisResponseSchema(): ResponseFormat {
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
            description: 'Treść sekcji "Opis meczu" w stylu dziennikarskim (5-7 zdań)',
          },
          zaleceniaTreningowe: {
            type: 'string',
            description: 'Treść sekcji "Zalecenia treningowe" (5-7 zdań z konkretnymi zaleceniami)',
          },
        },
        required: ['opisMeczu', 'zaleceniaTreningowe'],
        additionalProperties: false,
      },
    },
  };
}

/**
 * JSON Schema dla walidacji struktury odpowiedzi API
 * Używane do sprawdzania czy odpowiedź od OpenRouter ma prawidłową strukturę
 */
export const openRouterResponseSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    object: { type: 'string' },
    created: { type: 'number' },
    model: { type: 'string' },
    choices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          message: {
            type: 'object',
            properties: {
              role: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
          finish_reason: { type: 'string' },
        },
        required: ['index', 'message', 'finish_reason'],
      },
    },
    usage: {
      type: 'object',
      properties: {
        prompt_tokens: { type: 'number' },
        completion_tokens: { type: 'number' },
        total_tokens: { type: 'number' },
      },
      required: ['prompt_tokens', 'completion_tokens', 'total_tokens'],
    },
  },
  required: ['id', 'object', 'created', 'model', 'choices', 'usage'],
};

/**
 * JSON Schema dla walidacji struktury odpowiedzi analizy meczu
 * Sprawdza czy odpowiedź zawiera wymagane pola w prawidłowym formacie
 */
export const matchAnalysisContentSchema = {
  type: 'object',
  properties: {
    opisMeczu: {
      type: 'string',
      minLength: 50, // Minimalna długość dla 5 zdań
      maxLength: 2000, // Maksymalna długość dla 7 dłuższych zdań
    },
    zaleceniaTreningowe: {
      type: 'string',
      minLength: 50, // Minimalna długość dla 5 zdań
      maxLength: 2000, // Maksymalna długość dla 7 dłuższych zdań
    },
  },
  required: ['opisMeczu', 'zaleceniaTreningowe'],
  additionalProperties: false,
};

/**
 * Schemat dla walidacji requestu analizy meczu
 * Używany do wewnętrznej walidacji przed wysłaniem do API
 */
export const matchAnalysisRequestSchema = {
  type: 'object',
  properties: {
    matchId: {
      type: 'number',
      minimum: 1,
    },
    playerName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
    opponentName: {
      type: 'string',
      minLength: 1,
      maxLength: 100,
    },
    sets: {
      type: 'array',
      minItems: 1,
      maxItems: 7, // Maksymalnie 7 setów w meczu tenisa stołowego
      items: {
        type: 'object',
        properties: {
          sequenceInMatch: {
            type: 'number',
            minimum: 1,
            maximum: 7,
          },
          scorePlayer: {
            type: 'number',
            minimum: 0,
            maximum: 21, // Maksymalny wynik w secie
          },
          scoreOpponent: {
            type: 'number',
            minimum: 0,
            maximum: 21,
          },
          isGolden: {
            type: 'boolean',
          },
          coachNotes: {
            type: ['string', 'null'],
            maxLength: 500,
          },
          points: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                sequenceInSet: {
                  type: 'number',
                  minimum: 1,
                },
                scoredBy: {
                  enum: ['player', 'opponent'],
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 50,
                  },
                },
              },
              required: ['sequenceInSet', 'scoredBy', 'tags'],
            },
          },
        },
        required: ['sequenceInMatch', 'scorePlayer', 'scoreOpponent', 'isGolden', 'points'],
      },
    },
    coachNotes: {
      type: ['string', 'null'],
      maxLength: 1000,
    },
  },
  required: ['matchId', 'playerName', 'opponentName', 'sets'],
};

/**
 * Schemat dla walidacji konfiguracji OpenRouter
 */
export const openRouterConfigSchema = {
  type: 'object',
  properties: {
    apiKey: {
      type: 'string',
      pattern: '^sk-or-v1-', // OpenRouter API keys start with this prefix
    },
    baseUrl: {
      type: 'string',
      format: 'uri',
    },
    defaultModel: {
      type: 'string',
      minLength: 1,
    },
    fallbackModel: {
      type: 'string',
      minLength: 1,
    },
    timeout: {
      type: 'object',
      properties: {
        completion: {
          type: 'number',
          minimum: 1000,
          maximum: 300000,
        },
        streaming: {
          type: 'number',
          minimum: 1000,
          maximum: 600000,
        },
      },
      required: ['completion', 'streaming'],
    },
    retry: {
      type: 'object',
      properties: {
        maxAttempts: {
          type: 'number',
          minimum: 1,
          maximum: 10,
        },
        baseDelay: {
          type: 'number',
          minimum: 100,
          maximum: 10000,
        },
      },
      required: ['maxAttempts', 'baseDelay'],
    },
  },
  required: ['apiKey', 'baseUrl', 'defaultModel', 'fallbackModel', 'timeout', 'retry'],
};
