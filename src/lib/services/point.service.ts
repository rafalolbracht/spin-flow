import type { SupabaseClient } from "../../db/supabase.client";
import type {
  SideEnum,
  PointWithTagsDto,
  CreatePointDto,
  UndoPointDto,
  SetStateDto,
  PointInsert,
  Set,
  Match,
  PointTagInsert,
} from "../../types";
import { DatabaseError, ApiError } from "../utils/api-errors";
import { getSetById, getPointsBySetIds } from "./set.service";

/**
 * Get all points for a specific set
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setId - Set ID
 * @returns Array of points with tags or null if set not found or access denied
 */
export async function getPointsBySetId(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
): Promise<PointWithTagsDto[] | null> {
  // Verify set ownership through getSetById
  const set = await getSetById(supabase, userId, setId, false);
  if (!set) {
    return null;
  }

  // Use the optimized getPointsBySetIds from set.service
  const pointsBySetId = await getPointsBySetIds(supabase, userId, [setId]);
  return pointsBySetId[setId] || [];
}

/**
 * Create a new point in a set
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setId - Set ID
 * @param scoredBy - Which side scored the point
 * @param tagIds - Array of tag IDs to associate with the point
 * @returns CreatePointDto with the created point and updated set state
 */
export async function createPoint(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
  scoredBy: SideEnum,
  tagIds: number[],
): Promise<CreatePointDto> {
  // Get set with full match context
  const set = await getSetWithMatch(supabase, userId, setId);
  if (!set) {
    throw new ApiError("NOT_FOUND", "Set not found", 404);
  }

  const match = (set as Set & { matches: Match }).matches;

  // Validations
  if (match.status !== 'in_progress') {
    throw new ApiError("VALIDATION_ERROR", "Match is not in progress", 422);
  }

  if (set.is_finished) {
    throw new ApiError("VALIDATION_ERROR", "Set is already finished", 422);
  }

  // Validate tags exist if provided
  if (tagIds.length > 0) {
    await validateTagsExist(supabase, userId, tagIds);
  }

  // Calculate sequence and total points
  const { sequence, totalPoints } = await calculateNextPointSequence(supabase, setId, userId);

  // Determine who served this point
  const servedBy = calculateServedBy(match, set, totalPoints - 1); // -1 because we want the server before this point

  // Insert the point
  const pointData: PointInsert = {
    set_id: setId,
    user_id: userId,
    sequence_in_set: sequence,
    scored_by: scoredBy,
    served_by: servedBy,
  };

  const { data: newPoint, error: pointError } = await supabase
    .from("points")
    .insert(pointData)
    .select()
    .single();

  if (pointError) {
    throw new DatabaseError();
  }

  // Insert point tags if provided
  if (tagIds.length > 0) {
    const pointTags: PointTagInsert[] = tagIds.map(tagId => ({
      point_id: newPoint.id,
      tag_id: tagId,
      user_id: userId,
    }));

    const { error: tagsError } = await supabase
      .from("point_tags")
      .insert(pointTags);

    if (tagsError) {
      throw new DatabaseError();
    }
  }

  // Update set score
  const scoreField = scoredBy === 'player' ? 'set_score_player' : 'set_score_opponent';
  const { error: updateError } = await supabase
    .from("sets")
    .update({
      [scoreField]: (set[scoreField as keyof Set] as number) + 1,
    })
    .eq("id", setId)
    .eq("user_id", userId);

  if (updateError) {
    throw new DatabaseError();
  }

  // Get tag names for response
  const tagNames = tagIds.length > 0
    ? await getTagNamesByIds(supabase, userId, tagIds)
    : [];

  // Calculate next server (after this point was scored)
  const nextServer = calculateServedBy(match, set, totalPoints);

  // Calculate updated set state for flags
  const updatedSet: Set = {
    ...set,
    set_score_player: (set.set_score_player || 0) + (scoredBy === 'player' ? 1 : 0),
    set_score_opponent: (set.set_score_opponent || 0) + (scoredBy === 'opponent' ? 1 : 0),
  };

  const flags = calculateActionFlags(updatedSet, {
    max_sets: match.max_sets,
    sets_won_player: match.sets_won_player,
    sets_won_opponent: match.sets_won_opponent,
  });

  const pointWithTags: PointWithTagsDto = {
    ...newPoint,
    tags: tagNames,
  };

  const setState: SetStateDto = {
    id: setId,
    set_score_player: updatedSet.set_score_player,
    set_score_opponent: updatedSet.set_score_opponent,
    current_server: nextServer,
    can_undo_point: flags.can_undo_point,
    can_finish_set: flags.can_finish_set,
    can_finish_match: flags.can_finish_match,
  };

  return {
    ...pointWithTags,
    set_state: setState,
  };
}

/**
 * Undo the last point in a set
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param setId - Set ID
 * @returns UndoPointDto with deleted point ID and updated set state
 */
export async function undoLastPoint(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
): Promise<UndoPointDto> {
  // Get set with match context
  const set = await getSetWithMatch(supabase, userId, setId);
  if (!set) {
    throw new ApiError("NOT_FOUND", "Set not found", 404);
  }

  const match = (set as Set & { matches: Match }).matches;

  // Validations
  if (match.status !== 'in_progress') {
    throw new ApiError("VALIDATION_ERROR", "Match is not in progress", 422);
  }

  if (set.is_finished) {
    throw new ApiError("VALIDATION_ERROR", "Set is already finished", 422);
  }

  // Find the last point
  const { data: lastPoint, error: findError } = await supabase
    .from("points")
    .select("*")
    .eq("set_id", setId)
    .eq("user_id", userId)
    .order("sequence_in_set", { ascending: false })
    .limit(1)
    .single();

  if (findError || !lastPoint) {
    throw new ApiError("NOT_FOUND", "No points to undo", 404);
  }

  // Store served_by for the response (this was the server before the undone point)
  const previousServer = lastPoint.served_by as SideEnum;

  // Delete point tags first
  const { error: deleteTagsError } = await supabase
    .from("point_tags")
    .delete()
    .eq("point_id", lastPoint.id)
    .eq("user_id", userId);

  if (deleteTagsError) {
    throw new DatabaseError();
  }

  // Delete the point
  const { error: deletePointError } = await supabase
    .from("points")
    .delete()
    .eq("id", lastPoint.id)
    .eq("user_id", userId);

  if (deletePointError) {
    throw new DatabaseError();
  }

  // Update set score (decrement)
  const scoreField = lastPoint.scored_by === 'player' ? 'set_score_player' : 'set_score_opponent';
  const { error: updateError } = await supabase
    .from("sets")
    .update({
      [scoreField]: Math.max(0, (set[scoreField as keyof Set] as number) - 1),
    })
    .eq("id", setId)
    .eq("user_id", userId);

  if (updateError) {
    throw new DatabaseError();
  }

  // Calculate updated set state for flags
  const updatedSet: Set = {
    ...set,
    set_score_player: Math.max(0, (set.set_score_player || 0) - (lastPoint.scored_by === 'player' ? 1 : 0)),
    set_score_opponent: Math.max(0, (set.set_score_opponent || 0) - (lastPoint.scored_by === 'opponent' ? 1 : 0)),
  };

  const flags = calculateActionFlags(updatedSet, {
    max_sets: match.max_sets,
    sets_won_player: match.sets_won_player,
    sets_won_opponent: match.sets_won_opponent,
  });

  const setState: SetStateDto = {
    id: setId,
    set_score_player: updatedSet.set_score_player,
    set_score_opponent: updatedSet.set_score_opponent,
    current_server: previousServer,
    can_undo_point: flags.can_undo_point,
    can_finish_set: flags.can_finish_set,
    can_finish_match: flags.can_finish_match,
  };

  return {
    deleted_point_id: lastPoint.id,
    set_state: setState,
  };
}

// =============================================================================
// PRIVATE HELPER FUNCTIONS
// =============================================================================

/**
 * Get set with match context for operations that need both
 */
async function getSetWithMatch(
  supabase: SupabaseClient,
  userId: string,
  setId: number,
): Promise<(Set & { matches: Match }) | null> {
  const { data, error } = await supabase
    .from("sets")
    .select(`
      *,
      matches (
        id,
        user_id,
        status,
        first_server_first_set,
        golden_set_enabled,
        max_sets,
        sets_won_player,
        sets_won_opponent
      )
    `)
    .eq("id", setId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data as Set & { matches: Match };
}

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

/**
 * Validate that all provided tag IDs exist and belong to the user
 */
async function validateTagsExist(
  supabase: SupabaseClient,
  userId: string,
  tagIds: number[],
): Promise<void> {
  const { data: existingTags, error } = await supabase
    .from("tags")
    .select("id")
    .in("id", tagIds);

  if (error) {
    throw new DatabaseError();
  }

  const existingTagIds = existingTags?.map(tag => tag.id) || [];
  const invalidTags = tagIds.filter(id => !existingTagIds.includes(id));

  if (invalidTags.length > 0) {
    throw new ApiError("VALIDATION_ERROR", `Invalid tag IDs: ${invalidTags.join(", ")}`, 422);
  }
}

/**
 * Calculate the next sequence number and total points for a new point
 */
async function calculateNextPointSequence(
  supabase: SupabaseClient,
  setId: number,
  userId: string,
): Promise<{ sequence: number; totalPoints: number }> {
  const { data: points, error } = await supabase
    .from("points")
    .select("sequence_in_set")
    .eq("set_id", setId)
    .eq("user_id", userId);

  if (error) {
    throw new DatabaseError();
  }

  const totalPoints = points?.length || 0;
  const maxSequence = points?.length > 0 ? Math.max(...points.map(p => p.sequence_in_set)) : 0;

  return {
    sequence: maxSequence + 1,
    totalPoints: totalPoints + 1, // +1 for the new point we're about to add
  };
}

/**
 * Get tag names by their IDs
 */
async function getTagNamesByIds(
  supabase: SupabaseClient,
  userId: string,
  tagIds: number[],
): Promise<string[]> {
  if (tagIds.length === 0) {
    return [];
  }

  const { data: tags, error } = await supabase
    .from("tags")
    .select("name")
    .in("id", tagIds);

  if (error) {
    throw new DatabaseError();
  }

  return tags?.map(tag => tag.name) || [];
}

// =============================================================================
// SERVING LOGIC FUNCTIONS
// =============================================================================

/**
 * Calculate who should serve based on tennis table tennis rules
 * @param match - Match data
 * @param set - Set data
 * @param totalPointsInSet - Total number of points played in the set so far
 * @returns SideEnum indicating who should serve
 */
function calculateServedBy(
  match: Match,
  set: Set,
  totalPointsInSet: number,
): SideEnum {
  const firstServer = determineFirstServerForSet(match, set.sequence_in_match);

  if (set.is_golden) {
    // Golden set: change every point
    return totalPointsInSet % 2 === 0 ? firstServer : opposite(firstServer);
  }

  const playerScore = set.set_score_player || 0;
  const opponentScore = set.set_score_opponent || 0;

  if (playerScore >= 10 && opponentScore >= 10) {
    // Deuce: change every point
    return totalPointsInSet % 2 === 0 ? firstServer : opposite(firstServer);
  }

  // Normal play: change every 2 points
  return Math.floor(totalPointsInSet / 2) % 2 === 0
    ? firstServer
    : opposite(firstServer);
}

/**
 * Determine who serves first in a given set
 * @param match - Match data
 * @param sequenceInMatch - Set sequence number (1, 2, 3, etc.)
 * @returns SideEnum indicating first server for the set
 */
function determineFirstServerForSet(
  match: Match,
  sequenceInMatch: number,
): SideEnum {
  // Odd sets (1,3,5): first_server_first_set
  // Even sets (2,4,6): opposite
  return sequenceInMatch % 2 === 1
    ? match.first_server_first_set
    : opposite(match.first_server_first_set);
}

/**
 * Get the opposite side
 * @param side - Current side
 * @returns Opposite side
 */
function opposite(side: SideEnum): SideEnum {
  return side === "player" ? "opponent" : "player";
}
