import type { SupabaseClient } from "../../db/supabase.client";
import type {
  Set,
  SideEnum,
  CurrentSetDto,
  SetDetailDto,
  FinishSetCommandDto,
  FinishSetDto,
  FinishedSetDto,
  PointWithTagsDto,
  Match,
} from "../../types";
import { DatabaseError, ApiError } from "../utils/api-errors";

/**
 * Create the first set for a new match
 * @param supabase - Supabase client
 * @param matchId - Match ID
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param firstServer - First server for the first set
 * @param isGolden - Whether this is a golden set
 * @returns CurrentSetDto for the created set
 */
export async function createFirstSet(
  supabase: SupabaseClient,
  matchId: number,
  userId: string,
  firstServer: SideEnum,
  maxSets: number,
  isGolden = false,
): Promise<CurrentSetDto> {
  // Insert first set
  const { data: newSet, error } = await supabase
    .from("sets")
    .insert({
      match_id: matchId,
      user_id: userId,
      sequence_in_match: 1,
      is_finished: false,
      is_golden: isGolden,
      set_score_player: 0,
      set_score_opponent: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new DatabaseError();
  }

  return mapSetToCurrentSetDto(newSet, firstServer, {
    max_sets: maxSets,
    sets_won_player: 0,
    sets_won_opponent: 0,
  });
}

/**
 * Get all sets for a match
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @param includePoints - Whether to include points in the response
 * @returns Array of SetDetailDto
 */
export async function getSetsByMatchId(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  includePoints = false,
): Promise<SetDetailDto[]> {
  // Verify match ownership
  const { data: matchCheck } = await supabase
    .from("matches")
    .select("id")
    .eq("id", matchId)
    .eq("user_id", userId)
    .single();

  if (!matchCheck) {
    return []; // Return empty array for access denied (same as not found)
  }

  // Get all sets for the match
  const { data: sets, error } = await supabase
    .from("sets")
    .select("*")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .order("sequence_in_match", { ascending: true });

  if (error) {
    throw new DatabaseError();
  }

  if (!sets || sets.length === 0) {
    return [];
  }

  // If points are requested, fetch them efficiently
  let pointsBySetId: Record<number, PointWithTagsDto[]> | undefined;
  if (includePoints) {
    const setIds = sets.map(set => set.id);
    pointsBySetId = await getPointsBySetIds(supabase, userId, setIds);
  }

  return sets.map(set => mapSetToSetDetailDto(set, pointsBySetId?.[set.id]));
}

/**
 * Get a specific set by ID
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setId - Set ID
 * @param includePoints - Whether to include points in the response
 * @returns SetDetailDto or null if not found or access denied
 */
export async function getSetById(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  includePoints = false,
): Promise<SetDetailDto | null> {
  const { data: set, error } = await supabase
    .from("sets")
    .select("*")
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // Not found
      return null;
    }
    throw new DatabaseError();
  }

  // If points are requested, fetch them
  let points: PointWithTagsDto[] | undefined;
  if (includePoints) {
    const pointsBySetId = await getPointsBySetIds(supabase, userId, [setId]);
    points = pointsBySetId[setId];
  }

  return mapSetToSetDetailDto(set, points);
}

/**
 * Finish a set and create the next one
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setId - Set ID to finish
 * @param command - Finish set command
 * @returns FinishSetDto with finished and next set info
 */
export async function finishSet(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  command: FinishSetCommandDto,
): Promise<FinishSetDto | null> {
  // Get set and match info
  const { data: set, error: setError } = await supabase
    .from("sets")
    .select(`
      *,
      matches (
        id,
        user_id,
        status,
        max_sets,
        golden_set_enabled,
        first_server_first_set,
        sets_won_player,
        sets_won_opponent
      )
    `)
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (setError || !set) {
    return null; // Access denied or not found
  }

  const match = (set as Set & { matches: Match }).matches; // Type assertion for joined data

  // Validations
  if (set.is_finished) {
    throw new ApiError("VALIDATION_ERROR", "Set is already finished", 422);
  }

  if (match.status !== 'in_progress') {
    throw new ApiError("VALIDATION_ERROR", "Match is not in progress", 422);
  }

  // Check for tie score
  if (set.set_score_player === set.set_score_opponent) {
    throw new ApiError("VALIDATION_ERROR", "Cannot finish set with tie score", 422);
  }

  // Cannot finish last set - use POST /api/matches/{id}/finish instead
  if (set.sequence_in_match === match.max_sets) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "Cannot finish last set. Use POST /api/matches/{id}/finish to complete the match.",
      422,
    );
  }

  // Determine winner
  const winner: SideEnum = set.set_score_player > set.set_score_opponent ? 'player' : 'opponent';

  // Update set as finished
  const finishedAt = new Date().toISOString();
  const { error: updateSetError } = await supabase
    .from("sets")
    .update({
      is_finished: true,
      winner,
      finished_at: finishedAt,
      coach_notes: command.coach_notes || null,
    })
    .eq("id", setId)
    .eq("user_id", userId);

  if (updateSetError) {
    throw new DatabaseError();
  }

  // Update match sets won counts
  const incrementField = winner === 'player' ? 'sets_won_player' : 'sets_won_opponent';
  const newSetsWon = (match[incrementField as keyof Match] as number) + 1;
  const { error: updateMatchError } = await supabase
    .from("matches")
    .update({
      [incrementField]: newSetsWon,
    })
    .eq("id", match.id)
    .eq("user_id", userId);

  if (updateMatchError) {
    throw new DatabaseError();
  }

  // Create next set
  const nextSequence = set.sequence_in_match + 1;
  const nextFirstServer = determineNextServer(match, nextSequence);
  const isNextGolden = match.golden_set_enabled && nextSequence === match.max_sets;

  // Insert next set
  const { data: nextSet, error: nextSetError } = await supabase
    .from("sets")
    .insert({
      match_id: match.id,
      user_id: userId,
      sequence_in_match: nextSequence,
      is_finished: false,
      is_golden: isNextGolden,
      set_score_player: 0,
      set_score_opponent: 0,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (nextSetError) {
    throw new DatabaseError();
  }

  return {
    finished_set: mapSetToFinishedSetDto({ ...set, is_finished: true, winner, finished_at: finishedAt } as Set),
    next_set: mapSetToCurrentSetDto(nextSet, nextFirstServer, {
      max_sets: match.max_sets,
      sets_won_player: winner === 'player' ? match.sets_won_player + 1 : match.sets_won_player,
      sets_won_opponent: winner === 'opponent' ? match.sets_won_opponent + 1 : match.sets_won_opponent,
    }),
  };
}

/**
 * Get points for multiple sets efficiently (N+1 prevention)
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setIds - Array of set IDs
 * @returns Record mapping set ID to array of points with tags
 */
export async function getPointsBySetIds(
  supabase: SupabaseClient,
  userId: string,
  setIds: number[],
): Promise<Record<number, PointWithTagsDto[]>> {
  if (setIds.length === 0) {
    return {};
  }

  // Single query with nested select for points and tags
  const { data: points, error } = await supabase
    .from("points")
    .select(`
      *,
      point_tags(tags(name))
    `)
    .in("set_id", setIds)
    .eq("user_id", userId)
    .order("sequence_in_set", { ascending: true });

  if (error) {
    throw new DatabaseError();
  }

  // Group by set_id
  const pointsBySetId: Record<number, PointWithTagsDto[]> = {};
  setIds.forEach(setId => {
    pointsBySetId[setId] = [];
  });

  if (points) {
    points.forEach(point => {
      const tagNames = (point.point_tags as { tags: { name: string } | null }[])?.map(pt => pt.tags?.name).filter((name): name is string => Boolean(name)) || [];
      const pointWithTags: PointWithTagsDto = {
        ...point,
        tags: tagNames,
      };
      pointsBySetId[point.set_id].push(pointWithTags);
    });
  }

  return pointsBySetId;
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Calculate action flags for current set state
 * These flags determine which actions are available to the user
 */
function calculateActionFlags(
  set: Set,
  match: { max_sets: number; sets_won_player: number; sets_won_opponent: number },
): { can_undo_point: boolean; can_finish_set: boolean; can_finish_match: boolean } {
  // Can undo point if there are any points scored
  const can_undo_point = (set.set_score_player + set.set_score_opponent) > 0;

  // Cannot finish with tie score
  const isTied = set.set_score_player === set.set_score_opponent;
  
  if (isTied) {
    return {
      can_undo_point,
      can_finish_set: false,
      can_finish_match: false,
    };
  }

  // Determine who would win current set
  const setWinner: SideEnum = set.set_score_player > set.set_score_opponent ? 'player' : 'opponent';
  const newSetsWonPlayer = match.sets_won_player + (setWinner === 'player' ? 1 : 0);
  const newSetsWonOpponent = match.sets_won_opponent + (setWinner === 'opponent' ? 1 : 0);
  
  const setsToWin = Math.ceil(match.max_sets / 2);
  const matchWouldEnd = newSetsWonPlayer >= setsToWin || newSetsWonOpponent >= setsToWin;
  
  // Can finish set only if match wouldn't end and it's not the last possible set
  const setsPlayed = match.sets_won_player + match.sets_won_opponent + 1;
  const isLastPossibleSet = setsPlayed >= match.max_sets;
  const can_finish_set = !matchWouldEnd && !isLastPossibleSet;
  
  // Can finish match if match would end or it's the last possible set
  const can_finish_match = matchWouldEnd || isLastPossibleSet;

  return {
    can_undo_point,
    can_finish_set,
    can_finish_match,
  };
}

function mapSetToCurrentSetDto(
  set: Set,
  currentServer: SideEnum,
  match: { max_sets: number; sets_won_player: number; sets_won_opponent: number },
): CurrentSetDto {
  const flags = calculateActionFlags(set, match);
  
  return {
    id: set.id,
    sequence_in_match: set.sequence_in_match,
    is_golden: set.is_golden,
    set_score_player: set.set_score_player,
    set_score_opponent: set.set_score_opponent,
    is_finished: set.is_finished,
    current_server: currentServer,
    can_undo_point: flags.can_undo_point,
    can_finish_set: flags.can_finish_set,
    can_finish_match: flags.can_finish_match,
  };
}

function mapSetToSetDetailDto(
  set: Set,
  points?: PointWithTagsDto[],
): SetDetailDto {
  const dto: SetDetailDto = {
    id: set.id,
    match_id: set.match_id,
    sequence_in_match: set.sequence_in_match,
    is_golden: set.is_golden,
    set_score_player: set.set_score_player,
    set_score_opponent: set.set_score_opponent,
    winner: set.winner,
    is_finished: set.is_finished,
    coach_notes: set.coach_notes,
    created_at: set.created_at,
    finished_at: set.finished_at,
  };

  if (points) {
    dto.points = points;
  }

  return dto;
}

function mapSetToFinishedSetDto(set: Set): FinishedSetDto {
  // This function is only called after set is finished, so winner and finished_at are guaranteed to be set
  return {
    id: set.id,
    is_finished: set.is_finished,
    winner: set.winner as SideEnum,
    set_score_player: set.set_score_player,
    set_score_opponent: set.set_score_opponent,
    finished_at: set.finished_at as string,
  };
}

function determineNextServer(match: { first_server_first_set: SideEnum }, nextSequence: number): SideEnum {
  // Odd sets (1,3,5): first_server_first_set
  // Even sets (2,4,6): opposite
  return nextSequence % 2 === 1
    ? match.first_server_first_set
    : opposite(match.first_server_first_set);
}

function opposite(side: SideEnum): SideEnum {
  return side === "player" ? "opponent" : "player";
}
