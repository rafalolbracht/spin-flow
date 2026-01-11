/**
 * Konfiguracja MSW (Mock Service Worker) dla testów API
 * Używane do mockowania requestów HTTP w testach
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Przykładowe handlery dla API
export const handlers = [
  // Mock dla Supabase Auth
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
      },
    });
  }),

  // Mock dla OpenRouter (AI)
  http.post('https://openrouter.ai/api/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'mock-completion-id',
      object: 'chat.completion',
      created: Date.now(),
      model: 'mock-model',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Mock AI response for testing',
          },
          finish_reason: 'stop',
        },
      ],
    });
  }),
];

// Serwer MSW dla testów
export const server = setupServer(...handlers);

// Lifecycle hooks
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

