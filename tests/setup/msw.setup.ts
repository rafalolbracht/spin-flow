/**
 * Konfiguracja MSW (Mock Service Worker) dla testów API
 * Używane do mockowania requestów HTTP w testach
 */

import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

// Handlery dla API
export const handlers = [
  // === SUPABASE AUTH API ===

  // Get session - zwraca sesję dla zalogowanego użytkownika
  http.get('*/auth/v1/user', () => {
    return HttpResponse.json({
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: {
        full_name: 'Test User',
      },
    });
  }),

  // Get user - zwraca informacje o użytkowniku
  http.get('*/auth/v1/session', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
        },
      },
    });
  }),

  // Sign in with OAuth - przekierowanie do Google
  http.post('*/auth/v1/authorize', () => {
    return HttpResponse.json({
      url: 'https://accounts.google.com/oauth/authorize?mock=true',
      provider: 'google',
    });
  }),

  // Exchange code for session - callback z Google OAuth
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        user_metadata: {
          full_name: 'Test User',
        },
      },
    });
  }),

  // Sign out
  http.post('*/auth/v1/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // === SUPABASE DATABASE API ===

  // Matches - GET (paginated)
  http.get('*/rest/v1/matches', () => {
    return HttpResponse.json([
      {
        id: 1,
        player_name: 'Test Player',
        opponent_name: 'Test Opponent',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: true,
        status: 'in_progress',
        sets_won_player: 0,
        sets_won_opponent: 0,
        coach_notes: null,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
        user_id: 'test-user-id',
      },
    ]);
  }),

  // Matches - POST (create)
  http.post('*/rest/v1/matches', () => {
    return HttpResponse.json({
      id: 1,
      player_name: 'Test Player',
      opponent_name: 'Test Opponent',
      max_sets: 3,
      golden_set_enabled: false,
      first_server_first_set: 'player',
      generate_ai_summary: true,
      status: 'in_progress',
      sets_won_player: 0,
      sets_won_opponent: 0,
      coach_notes: null,
      started_at: '2024-01-01T10:00:00Z',
      ended_at: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      user_id: 'test-user-id',
    });
  }),

  // Sets - POST (create)
  http.post('*/rest/v1/sets', () => {
    return HttpResponse.json({
      id: 1,
      match_id: 1,
      sequence_in_match: 1,
      is_golden: false,
      set_score_player: 0,
      set_score_opponent: 0,
      current_server: 'player',
      is_finished: false,
      started_at: '2024-01-01T10:00:00Z',
      ended_at: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:00:00Z',
      user_id: 'test-user-id',
    });
  }),

  // Points - POST (create)
  http.post('*/rest/v1/points', () => {
    return HttpResponse.json({
      id: 1,
      set_id: 1,
      sequence_in_set: 1,
      scoring_player: 'player',
      served_by: 'player',
      created_at: '2024-01-01T10:00:00Z',
      user_id: 'test-user-id',
    });
  }),

  // Analytics - POST (track event)
  http.post('*/rest/v1/analytics_events', () => {
    return HttpResponse.json({ success: true });
  }),

  // === OPENROUTER AI API ===

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
            content: JSON.stringify({
              summary: 'Mock AI summary for testing',
              recommendations: ['Mock recommendation 1', 'Mock recommendation 2'],
              key_insights: ['Mock insight 1'],
            }),
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

