import { describe, it, expect } from 'vitest';
import { calculateServedBy } from '@/lib/services/point.service';
import type { Match, Set } from '@/types';

describe('Point Service - calculateServedBy', () => {
  const mockMatch: Match = {
    id: 1,
    player_name: 'Player',
    opponent_name: 'Opponent',
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
    user_id: 'test-user',
  };

  const mockSet: Set = {
    id: 1,
    match_id: 1,
    user_id: 'test-user',
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

  describe('calculateServedBy', () => {
    it('should return first server for first point in set', () => {
      expect(calculateServedBy(mockMatch, mockSet, 0)).toBe('player');
    });

    it('should alternate server every 2 points in normal set', () => {
      // Point 1 (after 1 point scored): player serves (floor(1/2)=0, even → firstServer)
      expect(calculateServedBy(mockMatch, mockSet, 1)).toBe('player');

      // Point 2 (after 2 points scored): opponent serves (floor(2/2)=1, odd → opposite)
      expect(calculateServedBy(mockMatch, mockSet, 2)).toBe('opponent');

      // Point 3 (after 3 points scored): opponent serves (floor(3/2)=1, odd → opposite)
      expect(calculateServedBy(mockMatch, mockSet, 3)).toBe('opponent');

      // Point 4 (after 4 points scored): player serves (floor(4/2)=2, even → firstServer)
      expect(calculateServedBy(mockMatch, mockSet, 4)).toBe('player');

      // Point 5 (after 5 points scored): player serves (floor(5/2)=2, even → firstServer)
      expect(calculateServedBy(mockMatch, mockSet, 5)).toBe('player');

      // Point 6 (after 6 points scored): opponent serves (floor(6/2)=3, odd → opposite)
      expect(calculateServedBy(mockMatch, mockSet, 6)).toBe('opponent');
    });

    it('should alternate server every 1 point in golden set', () => {
      const goldenSet = { ...mockSet, is_golden: true };

      // Point 1 (after 1 point): 1 % 2 === 1 (odd) → opposite(firstServer) → opponent
      expect(calculateServedBy(mockMatch, goldenSet, 1)).toBe('opponent');

      // Point 2 (after 2 points): 2 % 2 === 0 (even) → firstServer → player
      expect(calculateServedBy(mockMatch, goldenSet, 2)).toBe('player');

      // Point 3 (after 3 points): 3 % 2 === 1 (odd) → opposite(firstServer) → opponent
      expect(calculateServedBy(mockMatch, goldenSet, 3)).toBe('opponent');

      // Point 4 (after 4 points): 4 % 2 === 0 (even) → firstServer → player
      expect(calculateServedBy(mockMatch, goldenSet, 4)).toBe('player');
    });

    it('should handle deuce situations correctly', () => {
      // Create set in deuce situation (10-10)
      const deuceSet = {
        ...mockSet,
        set_score_player: 10,
        set_score_opponent: 10,
      };

      // In deuce, server changes every point (same as golden set)
      // Point 21 (after 21 points): 21 % 2 === 1 (odd) → opposite(firstServer) → opponent
      expect(calculateServedBy(mockMatch, deuceSet, 21)).toBe('opponent');

      // Point 22 (after 22 points): 22 % 2 === 0 (even) → firstServer → player
      expect(calculateServedBy(mockMatch, deuceSet, 22)).toBe('player');

      // Point 23 (after 23 points): 23 % 2 === 1 (odd) → opposite(firstServer) → opponent
      expect(calculateServedBy(mockMatch, deuceSet, 23)).toBe('opponent');
    });

    it('should handle different first servers correctly', () => {
      const opponentFirstMatch = { ...mockMatch, first_server_first_set: 'opponent' as const };

      // First point: opponent serves (since opponent is first_server_first_set)
      expect(calculateServedBy(opponentFirstMatch, mockSet, 0)).toBe('opponent');

      // Point 1 (after 1 point): opponent serves (floor(1/2)=0, even → firstServer → opponent)
      expect(calculateServedBy(opponentFirstMatch, mockSet, 1)).toBe('opponent');

      // Point 2 (after 2 points): player serves (floor(2/2)=1, odd → opposite → player)
      expect(calculateServedBy(opponentFirstMatch, mockSet, 2)).toBe('player');

      // Point 3 (after 3 points): player serves (floor(3/2)=1, odd → opposite → player)
      expect(calculateServedBy(opponentFirstMatch, mockSet, 3)).toBe('player');

      // Point 4 (after 4 points): opponent serves (floor(4/2)=2, even → firstServer → opponent)
      expect(calculateServedBy(opponentFirstMatch, mockSet, 4)).toBe('opponent');
    });

    it('should handle different set sequences correctly', () => {
      const secondSet = { ...mockSet, sequence_in_match: 2 };

      // Second set: first server is opponent (opposite of first_server_first_set = 'player')
      expect(calculateServedBy(mockMatch, secondSet, 0)).toBe('opponent');

      // Point 1 (after 1 point): opponent serves (floor(1/2)=0, even → firstServer → opponent)
      expect(calculateServedBy(mockMatch, secondSet, 1)).toBe('opponent');

      // Point 2 (after 2 points): player serves (floor(2/2)=1, odd → opposite → player)
      expect(calculateServedBy(mockMatch, secondSet, 2)).toBe('player');
    });
  });
});