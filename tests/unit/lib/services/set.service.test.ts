import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@/db/supabase.client';
import {
  createFirstSet,
  calculateActionFlags,
} from '@/lib/services/set.service';

import type {
  Set,
} from '@/types';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
} as unknown as SupabaseClient;

describe('Set Service', () => {
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFirstSet', () => {
    it('should create first set for a match', async () => {
      const mockCreatedSet: Set = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 0,
        set_score_opponent: 0,
        winner: null,
        current_server: 'player',
        finished_at: null,
        coach_notes: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockSupabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedSet,
              error: null,
            }),
          }),
        }),
      });

      const result = await createFirstSet(mockSupabase, 1, mockUserId, 'player', 3, false);

      expect(result.id).toBe(1);
      expect(result.sequence_in_match).toBe(1);
      expect(result.is_golden).toBe(false);
      expect(result.current_server).toBe('player');
      expect(result.can_undo_point).toBe(false);
      expect(result.can_finish_set).toBe(false);
      expect(result.can_finish_match).toBe(false);
    });

    it('should create golden first set when specified', async () => {
      const mockCreatedSet: Set = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: true,
        set_score_player: 0,
        set_score_opponent: 0,
        winner: null,
        current_server: 'player',
        finished_at: null,
        coach_notes: null,
        created_at: '2024-01-01T10:00:00Z',
        updated_at: '2024-01-01T10:00:00Z',
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockCreatedSet,
              error: null,
            }),
          }),
        }),
      });

      const result = await createFirstSet(mockSupabase, 1, mockUserId, 'player', 1, true);

      expect(result.is_golden).toBe(true);
    });
  });


  describe('calculateActionFlags', () => {
    it('should allow undo when set has points', () => {
      const result = calculateActionFlags(
        {
          id: 1,
          user_id: mockUserId,
          match_id: 1,
          sequence_in_match: 1,
          is_finished: false,
          is_golden: false,
          set_score_player: 5,
          set_score_opponent: 3,
          winner: null,
          current_server: 'player',
          finished_at: null,
          coach_notes: null,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        { max_sets: 3, sets_won_player: 0, sets_won_opponent: 0 },
      );

      expect(result.can_undo_point).toBe(true);
    });

    it('should not allow undo when set has no points', () => {
      const result = calculateActionFlags(
        {
          id: 1,
          user_id: mockUserId,
          match_id: 1,
          sequence_in_match: 1,
          is_finished: false,
          is_golden: false,
          set_score_player: 0,
          set_score_opponent: 0,
          winner: null,
          current_server: 'player',
          finished_at: null,
          coach_notes: null,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        { max_sets: 3, sets_won_player: 0, sets_won_opponent: 0 },
      );

      expect(result.can_undo_point).toBe(false);
    });

    it('should allow finishing set when score difference is sufficient', () => {
      const result = calculateActionFlags(
        {
          id: 1,
          user_id: mockUserId,
          match_id: 1,
          sequence_in_match: 1,
          is_finished: false,
          is_golden: false,
          set_score_player: 11,
          set_score_opponent: 9,
          winner: null,
          current_server: 'player',
          finished_at: null,
          coach_notes: null,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        { max_sets: 3, sets_won_player: 0, sets_won_opponent: 0 },
      );

      expect(result.can_finish_set).toBe(true);
    });

    it('should not allow finishing set with insufficient score difference', () => {
      const result = calculateActionFlags(
        {
          id: 1,
          user_id: mockUserId,
          match_id: 1,
          sequence_in_match: 1,
          is_finished: false,
          is_golden: false,
          set_score_player: 10,
          set_score_opponent: 10, // Tie score - cannot finish
          winner: null,
          current_server: 'player',
          finished_at: null,
          coach_notes: null,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        { max_sets: 3, sets_won_player: 0, sets_won_opponent: 0 },
      );

      expect(result.can_finish_set).toBe(false);
    });

    it('should allow finishing match when winning last set', () => {
      const result = calculateActionFlags(
        {
          id: 3,
          user_id: mockUserId,
          match_id: 1,
          sequence_in_match: 3,
          is_finished: false,
          is_golden: false,
          set_score_player: 11,
          set_score_opponent: 9,
          winner: null,
          current_server: 'player',
          finished_at: null,
          coach_notes: null,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z',
        },
        { max_sets: 3, sets_won_player: 1, sets_won_opponent: 1 }, // Player wins this set to win match
      );

      expect(result.can_finish_match).toBe(true);
    });
  });
});