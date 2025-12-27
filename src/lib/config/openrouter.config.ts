/**
 * OpenRouter Configuration
 * Konfiguracja dla usługi OpenRouter
 */

import type { OpenRouterConfig } from '../services/openrouter/openrouter.types';

/**
 * Tworzy konfigurację OpenRouter z environment variables
 */
export function createOpenRouterConfig(): OpenRouterConfig {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OPENROUTER_API_KEY environment variable is required. ' +
      'Please add it to your environment configuration.',
    );
  }

  return {
    apiKey,
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'x-ai/grok-4.1-fast',
    fallbackModel: 'openai/gpt-4o-mini',
    timeout: {
      completion: 30000,    // 30 sekund na completion
      streaming: 300000,     // 5 minut na streaming (jeśli będzie używane)
    },
    retry: {
      maxAttempts: 3,       // Maksymalnie 3 próby
      baseDelay: 1000,       // Bazowy delay 1 sekunda z exponential backoff
    },
  };
}

/**
 * Globalna instancja konfiguracji OpenRouter
 * Używana przez aplikację do inicjalizacji usługi
 */
export const openRouterConfig = createOpenRouterConfig();
