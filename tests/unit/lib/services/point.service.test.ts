import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getPointsBySetId,
  createPoint,
  undoLastPoint,
} from '@/lib/services/point.service';
import { createMockSupabaseClient, createMockPoint } from '../../../setup/test-helpers';
import type { PointWithTagsDto } from '@/types';

// Mock set service
vi.mock('@/lib/services/set.service', () => ({
  getSetById: vi.fn(),
  getPointsBySetIds: vi.fn(),
  calculateActionFlags: vi.fn(),
}));

import { getSetById, getPointsBySetIds, calculateActionFlags } from '@/lib/services/set.service';

describe('Point Service', () => {
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

  describe('getPointsBySetId', () => {
    it('should return points for existing set', async () => {
      const mockPoints: PointWithTagsDto[] = [
        {
          id: 1,
          set_id: 1,
          user_id: mockUserId,
          sequence_in_set: 1,
          scored_by: 'player',
          served_by: 'player',
          created_at: '2024-01-01T10:00:00Z',
          tags: ['forehand'],
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSetById as any).mockResolvedValue({
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 1,
        set_score_opponent: 0,
        created_at: '2024-01-01T10:00:00Z',
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getPointsBySetIds as any).mockResolvedValue({
        1: mockPoints,
      });

      const result = await getPointsBySetId(mockSupabase, mockUserId, 1);

      expect(result).toEqual(mockPoints);
      expect(getSetById).toHaveBeenCalledWith(mockSupabase, mockUserId, 1, false);
      expect(getPointsBySetIds).toHaveBeenCalledWith(mockSupabase, mockUserId, [1]);
    });

    it('should return null when set not found', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (getSetById as any).mockResolvedValue(null);

      const result = await getPointsBySetId(mockSupabase, mockUserId, 999);

      expect(result).toBeNull();
      expect(getPointsBySetIds).not.toHaveBeenCalled();
    });
  });

  describe('createPoint', () => {
    it('should create point successfully with tags', async () => {
      const mockMatch = {
        id: 1,
        player_name: 'John',
        opponent_name: 'Jane',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: false,
        status: 'in_progress',
        sets_won_player: 0,
        sets_won_opponent: 0,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        created_at: '2024-01-01T10:00:00Z',
        user_id: mockUserId,
      };

      const mockSet = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 5,
        set_score_opponent: 3,
        created_at: '2024-01-01T10:00:00Z',
        matches: mockMatch,
      };

      const existingPoints = [
        createMockPoint({ id: 1, set_id: 1, sequence_in_set: 1, user_id: mockUserId }),
        createMockPoint({ id: 2, set_id: 1, sequence_in_set: 2, user_id: mockUserId }),
      ];

      // Setup mock data
      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
        sets: [mockSet],
        points: existingPoints,
        tags: [{ id: 1, name: 'forehand', user_id: mockUserId }],
      });

      // Mock calculateActionFlags
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (calculateActionFlags as any).mockResolvedValue({
        can_undo_point: true,
        can_finish_set: false,
        can_finish_match: false,
      });

      const result = await createPoint(mockSupabase, mockUserId, 1, 'player', [1]);

      expect(result.id).toBeDefined();
      expect(result.set_id).toBe(1);
      expect(result.scored_by).toBe('player');
      expect(result.sequence_in_set).toBe(3); // Next sequence after 2 existing points
    });

    it('should throw error when match is not in progress', async () => {
      const mockMatch = {
        id: 1,
        status: 'finished', // Match is finished
        player_name: 'John',
        opponent_name: 'Jane',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: false,
        sets_won_player: 2,
        sets_won_opponent: 1,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
        user_id: mockUserId,
      };

      const mockSet = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 11,
        set_score_opponent: 9,
        created_at: '2024-01-01T10:00:00Z',
        matches: mockMatch,
      };

      // Setup mock data
      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
        sets: [mockSet],
      });

      await expect(createPoint(mockSupabase, mockUserId, 1, 'player', []))
        .rejects
        .toThrow('Match is not in progress');
    });
  });

  describe('undoLastPoint', () => {
    it('should undo last point successfully', async () => {
      const mockMatch = {
        id: 1,
        status: 'in_progress',
        player_name: 'John',
        opponent_name: 'Jane',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: false,
        sets_won_player: 0,
        sets_won_opponent: 0,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        created_at: '2024-01-01T10:00:00Z',
        user_id: mockUserId,
      };

      const mockSet = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 6,
        set_score_opponent: 3,
        created_at: '2024-01-01T10:00:00Z',
        matches: mockMatch,
      };

      const mockLastPoint = createMockPoint({
        id: 5,
        set_id: 1,
        user_id: mockUserId,
        sequence_in_set: 9,
        scored_by: 'player',
        served_by: 'player',
        created_at: '2024-01-01T10:05:00Z',
      });

      // Setup mock data
      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
        sets: [mockSet],
        points: [mockLastPoint],
      });

      // Mock calculateActionFlags
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (calculateActionFlags as any).mockResolvedValue({
        can_undo_point: true,
        can_finish_set: false,
        can_finish_match: false,
      });

      const result = await undoLastPoint(mockSupabase, mockUserId, 1);

      expect(result.deleted_point_id).toBe(5);
      expect(result.set_state.set_score_player).toBe(5); // 6 - 1
      expect(result.set_state.set_score_opponent).toBe(3);
    });

    it('should throw error when no points to undo', async () => {
      const mockMatch = {
        id: 1,
        status: 'in_progress',
        player_name: 'John',
        opponent_name: 'Jane',
        max_sets: 3,
        golden_set_enabled: false,
        first_server_first_set: 'player',
        generate_ai_summary: false,
        sets_won_player: 0,
        sets_won_opponent: 0,
        started_at: '2024-01-01T10:00:00Z',
        ended_at: null,
        created_at: '2024-01-01T10:00:00Z',
        user_id: mockUserId,
      };

      const mockSet = {
        id: 1,
        match_id: 1,
        user_id: mockUserId,
        sequence_in_match: 1,
        is_finished: false,
        is_golden: false,
        set_score_player: 0,
        set_score_opponent: 0,
        created_at: '2024-01-01T10:00:00Z',
        matches: mockMatch,
      };

      // Setup mock data without any points
      mockSupabase = createMockSupabaseClient({
        matches: [mockMatch],
        sets: [mockSet],
        points: [], // No points to undo
      });

      await expect(undoLastPoint(mockSupabase, mockUserId, 1))
        .rejects
        .toThrow('No points to undo');
    });
  });
});