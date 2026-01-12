import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getMatchesPaginated,
  createMatch,
  getMatchById,
} from '@/lib/services/match.service';
import { createMockSupabaseClient, createMockMatch } from '../../../setup/test-helpers';
import type { CreateMatchCommandDto, CurrentSetDto } from '@/types';

// Mock dependencies
vi.mock('@/lib/services/set.service', () => ({
  createFirstSet: vi.fn(),
}));

vi.mock('@/lib/services/analytics.service', () => ({
  trackEvent: vi.fn(),
}));

// Import mocked functions
import { createFirstSet } from '@/lib/services/set.service';
import { trackEvent } from '@/lib/services/analytics.service';

describe('Match Service', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;

  const mockUserId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMatchesPaginated', () => {
    it('should validate sort field and throw error for invalid field', async () => {
      const mockQuery = {
        page: 1,
        limit: 10,
        sort: 'invalid_field',
      };

      await expect(getMatchesPaginated(mockSupabase, mockUserId, mockQuery))
        .rejects
        .toThrow('Invalid sort field: invalid_field');
    });

    it('should accept valid sort fields', async () => {
      const mockQuery = {
        page: 1,
        limit: 10,
        sort: '-started_at',
      };

      const mockMatch = createMockMatch({
        id: 1,
        player_name: 'John',
        opponent_name: 'Jane',
        user_id: mockUserId,
      });

      // Setup initial data in mock
      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
      });

      const result = await getMatchesPaginated(mockSupabase, mockUserId, mockQuery);

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.data[0].player_name).toBe('John');
    });
  });

  describe('createMatch', () => {
    it('should create a new match with first set and track analytics', async () => {
      const command: CreateMatchCommandDto = {
        player_name: 'John Doe',
        opponent_name: 'Jane Smith',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: true,
      };

      const mockCurrentSet: CurrentSetDto = {
        id: 1,
        sequence_in_match: 1,
        is_golden: false,
        set_score_player: 0,
        set_score_opponent: 0,
        current_server: 'player',
        can_undo_point: false,
        can_finish_set: false,
        can_finish_match: false,
        is_finished: false,
      };

      // Mock dependencies
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createFirstSet as any).mockResolvedValue(mockCurrentSet);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (trackEvent as any).mockResolvedValue(undefined);

      const result = await createMatch(mockSupabase, mockUserId, command);

      expect(result.result.player_name).toBe('John Doe');
      expect(result.result.current_set).toEqual(mockCurrentSet);
      expect(createFirstSet).toHaveBeenCalledWith(
        mockSupabase,
        1,
        mockUserId,
        'player',
        3,
        false,
      );
      expect(trackEvent).toHaveBeenCalledWith(mockSupabase, mockUserId, 'match_created', 1);
    });

    it('should create golden set when max_sets is 1 and golden_set_enabled', async () => {
      const command: CreateMatchCommandDto = {
        player_name: 'John Doe',
        opponent_name: 'Jane Smith',
        max_sets: 1,
        golden_set_enabled: true,
        first_server_first_set: 'player',
        generate_ai_summary: false,
      };

      const mockCurrentSet: CurrentSetDto = {
        id: 1,
        sequence_in_match: 1,
        is_golden: true,
        set_score_player: 0,
        set_score_opponent: 0,
        current_server: 'player',
        can_undo_point: false,
        can_finish_set: false,
        can_finish_match: false,
        is_finished: false,
      };

      // Mock createFirstSet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createFirstSet as any).mockResolvedValue(mockCurrentSet);

      await createMatch(mockSupabase, mockUserId, command);

      expect(createFirstSet).toHaveBeenCalledWith(
        mockSupabase,
        1,
        mockUserId,
        'player',
        1,
        true, // is_golden should be true
      );
    });
  });

  describe('getMatchById', () => {
    it('should return null when match not found', async () => {
      const result = await getMatchById(mockSupabase, mockUserId, 999);

      expect(result).toBeNull();
    });

    it('should return match when found', async () => {
      const mockMatch = createMockMatch({
        id: 1,
        player_name: 'Test Player',
        user_id: mockUserId,
      });

      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
      });

      const result = await getMatchById(mockSupabase, mockUserId, 1);

      expect(result).not.toBeNull();
      expect(result?.player_name).toBe('Test Player');
    });
  });
});