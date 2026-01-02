import type { SupabaseClient } from "../../db/supabase.client";
import type {
  Match,
  MatchInsert,
  MatchUpdate,
  MatchListItemDto,
  MatchDetailDto,
  CreateMatchCommandDto,
  CreateMatchDto,
  UpdateMatchCommandDto,
  UpdateMatchDto,
  FinishMatchCommandDto,
  FinishMatchDto,
  CurrentSetDto,
  SetDetailDto,
  AiReportDto,
  PaginationDto,
  SideEnum,
} from "../../types";
import { DatabaseError, ApiError } from "../utils/api-errors";
import { logError } from "../utils/logger";
import { createFirstSet, calculateActionFlags } from "./set.service";
import { getSetsByMatchId } from "./set.service";
import { trackEvent } from "./analytics.service";

// Type for Cloudflare runtime environment variables
type RuntimeEnv = Record<string, string | undefined>;
import { createAiReportRecord, getAiReportByMatchId } from "./ai.service";

/**
 * Get paginated list of matches with filtering and sorting
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param query - Validated query parameters
 * @returns Paginated match list data
 */
export async function getMatchesPaginated(
  supabase: SupabaseClient,
  userId: string,
  query: {
    page: number;
    limit: number;
    player_name?: string;
    opponent_name?: string;
    status?: string;
    sort: string;
  },
): Promise<{ data: MatchListItemDto[]; pagination: PaginationDto }> {
  // Parse sort parameter
  const { column, ascending } = parseSortParam(query.sort);

  // Build filtered query
  let countQuery = supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  // Apply filters
  countQuery = applyFilters(countQuery, query);

  // Get total count
  const { count, error: countError } = await countQuery;
  if (countError) {
    throw new DatabaseError();
  }

  const total = count || 0;

  // Build data query
  let dataQuery = supabase
    .from("matches")
    .select("*")
    .eq("user_id", userId);

  // Apply filters
  dataQuery = applyFilters(dataQuery, query);

  // Apply sorting and pagination
  const offset = (query.page - 1) * query.limit;
  dataQuery = dataQuery
    .order(column, { ascending })
    .range(offset, offset + query.limit - 1);

  // Execute query
  const { data, error } = await dataQuery;
  if (error) {
    throw new DatabaseError();
  }

  // Map to DTOs (remove user_id)
  const matches = (data || []).map(mapMatchToMatchListItemDto);

  return {
    data: matches,
    pagination: { total },
  };
}

/**
 * Create a new match and its first set
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param command - Match creation command
 * @returns Created match with first set
 */
export async function createMatch(
  supabase: SupabaseClient,
  userId: string,
  command: CreateMatchCommandDto,
): Promise<{ result: CreateMatchDto; waitUntilPromise?: Promise<void> }> {
  // Insert match
  const matchData: MatchInsert = {
    player_name: command.player_name,
    opponent_name: command.opponent_name,
    max_sets: command.max_sets,
    golden_set_enabled: command.golden_set_enabled,
    first_server_first_set: command.first_server_first_set,
    generate_ai_summary: command.generate_ai_summary,
    status: "in_progress",
    sets_won_player: 0,
    sets_won_opponent: 0,
    coach_notes: null,
    started_at: new Date().toISOString(),
    ended_at: null,
    created_at: new Date().toISOString(),
    user_id: userId,
  };

  const { data: newMatch, error: matchError } = await supabase
    .from("matches")
    .insert(matchData)
    .select()
    .single();

  if (matchError) {
    throw new DatabaseError();
  }

  // Create first set
  // First set is golden only if max_sets is 1 and golden_set_enabled is true
  const isFirstSetGolden = command.golden_set_enabled && command.max_sets === 1;
  const currentSet = await createFirstSet(
    supabase,
    newMatch.id,
    userId,
    command.first_server_first_set,
    command.max_sets,
    isFirstSetGolden,
  );

  const result = mapMatchToCreateMatchDto(newMatch, currentSet);

  // Track analytics event in background (fire-and-forget with waitUntil)
  const waitUntilPromise = trackEvent(supabase, userId, "match_created", newMatch.id);

  return { result, waitUntilPromise };
}

/**
 * Get a match by ID with optional relations
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @param include - Comma-separated list of relations to include
 * @returns Match detail DTO or null if not found
 */
export async function getMatchById(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  include?: string,
): Promise<MatchDetailDto | null> {
  // Verify ownership
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .eq("user_id", userId)
    .single();

  if (error || !match) {
    return null;
  }

  // Parse include parameter
  const includeOptions = parseIncludeParam(include);

  // Load relations
  let sets: SetDetailDto[] | undefined;
  let aiReport: AiReportDto | null = null;
  let currentSet: CurrentSetDto | null = null;

  if (includeOptions.sets || includeOptions.points || includeOptions.tags) {
    const includePoints = includeOptions.points || includeOptions.tags;
    sets = await getSetsByMatchId(supabase, userId, matchId, includePoints);
  }

  if (includeOptions.ai_report && match.generate_ai_summary) {
    aiReport = await getAiReportByMatchId(supabase, userId, matchId);
  }

  // Determine current set if match is in progress
  if (match.status === "in_progress" && sets) {
    const unfinishedSet = sets.find(set => !set.is_finished);
    if (unfinishedSet) {
      // Calculate action flags for the unfinished set
      const actionFlags = calculateActionFlags({ ...unfinishedSet, user_id: match.user_id }, {
        max_sets: match.max_sets,
        sets_won_player: match.sets_won_player,
        sets_won_opponent: match.sets_won_opponent,
      });

      // Calculate current server for unfinished set
      currentSet = {
        id: unfinishedSet.id,
        sequence_in_match: unfinishedSet.sequence_in_match,
        is_golden: unfinishedSet.is_golden,
        set_score_player: unfinishedSet.set_score_player,
        set_score_opponent: unfinishedSet.set_score_opponent,
        is_finished: unfinishedSet.is_finished,
        current_server: unfinishedSet.current_server || match.first_server_first_set,
        can_undo_point: actionFlags.can_undo_point,
        can_finish_set: actionFlags.can_finish_set,
        can_finish_match: actionFlags.can_finish_match,
      };
    }
  }

  return mapMatchToMatchDetailDto(match, currentSet, sets, aiReport);
}

/**
 * Update match metadata
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @param command - Update command
 * @returns Updated match DTO or null if not found
 */
export async function updateMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: UpdateMatchCommandDto,
): Promise<UpdateMatchDto | null> {
  // Verify ownership
  const existingMatch = await getMatchById(supabase, userId, matchId, undefined);
  if (!existingMatch) {
    return null;
  }

  // Build update object with only provided fields
  const updateData: MatchUpdate = {};

  if (command.player_name !== undefined) {
    updateData.player_name = command.player_name;
  }
  if (command.opponent_name !== undefined) {
    updateData.opponent_name = command.opponent_name;
  }
  if (command.coach_notes !== undefined) {
    updateData.coach_notes = command.coach_notes;
  }

  // Update match
  const { data, error } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new DatabaseError();
  }

  return mapMatchToUpdateMatchDto(data);
}

/**
 * Finish a match with AI report generation and analytics
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @param command - Finish match command
 * @param runtimeEnv - Cloudflare runtime environment variables (optional)
 * @returns Finished match DTO
 */
export async function finishMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
  command: FinishMatchCommandDto,
  runtimeEnv?: RuntimeEnv,
): Promise<{ result: FinishMatchDto; waitUntilPromise?: Promise<void> }> {
  // Get match with current set
  const match = await getMatchById(supabase, userId, matchId, "sets");
  if (!match) {
    throw new ApiError("NOT_FOUND", "Match not found", 404);
  }

  if (match.status === "finished") {
    throw new ApiError("VALIDATION_ERROR", "Match is already finished", 422);
  }

  // Finish current set if not finished
  if (match.current_set && !match.current_set.is_finished) {
    // Validate: cannot finish with tie score
    if (match.current_set.set_score_player === match.current_set.set_score_opponent) {
      throw new ApiError("VALIDATION_ERROR", "Cannot finish match with tie score in current set", 422);
    }

    // Determine winner of current set
    const setWinner: SideEnum = match.current_set.set_score_player > match.current_set.set_score_opponent
      ? 'player'
      : 'opponent';

    // Update current set as finished
    const finishedAt = new Date().toISOString();
    const { error: updateSetError } = await supabase
      .from("sets")
      .update({
        is_finished: true,
        winner: setWinner,
        finished_at: finishedAt,
        coach_notes: null, // Coach notes go to match, not individual set
      })
      .eq("id", match.current_set.id)
      .eq("user_id", userId);

    if (updateSetError) {
      throw new DatabaseError();
    }

    // Update match sets won counts
    const incrementField = setWinner === 'player' ? 'sets_won_player' : 'sets_won_opponent';
    const currentSetsWon = match[incrementField];
    const newSetsWon = currentSetsWon + 1;

    const { error: updateMatchSetsError } = await supabase
      .from("matches")
      .update({
        [incrementField]: newSetsWon,
      })
      .eq("id", matchId)
      .eq("user_id", userId);

    if (updateMatchSetsError) {
      throw new DatabaseError();
    }

    // Update local match object for validation
    match[incrementField] = newSetsWon;
  }

  // Validate: match result cannot be a tie (considering finished current set)
  if (match.sets_won_player === match.sets_won_opponent) {
    throw new ApiError("VALIDATION_ERROR", "Cannot finish match with tie score in sets", 422);
  }

  // Update match status
  const updateData: MatchUpdate = {
    status: "finished",
    ended_at: new Date().toISOString(),
    coach_notes: command.coach_notes || match.coach_notes,
  };

  const { error: updateError } = await supabase
    .from("matches")
    .update(updateData)
    .eq("id", matchId)
    .eq("user_id", userId);

  if (updateError) {
    throw new DatabaseError();
  }

  // Get updated match data
  const finishedMatch = await getMatchById(supabase, userId, matchId, undefined);
  if (!finishedMatch) {
    throw new DatabaseError();
  }

  const result = mapMatchToFinishMatchDto(finishedMatch);

  // Prepare background operations (to be used with context.waitUntil)
  const backgroundPromises: Promise<void>[] = [];

  // Track analytics event
  backgroundPromises.push(trackEvent(supabase, userId, "match_finished", matchId));

  // AI generation if enabled
  if (match.generate_ai_summary) {
    backgroundPromises.push((async () => {
      try {
        await createAiReportRecord(supabase, matchId, userId);
        // Import and execute AI report generation
        const { generateAiReport } = await import("./ai.service");
        await generateAiReport(supabase, matchId, runtimeEnv);
      } catch (error) {
        // Log error but don't throw - this is fire-and-forget
        logError(
          "match.service.finishMatch",
          error instanceof Error ? error : new Error(String(error)),
          { matchId },
        );
      }
    })());
  }

  const waitUntilPromise = backgroundPromises.length > 0
    ? Promise.all(backgroundPromises).then(() => undefined)
    : undefined;

  return { result, waitUntilPromise };
}

/**
 * Delete a match and all related data
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @returns True if deleted, false if not found
 */
export async function deleteMatch(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<boolean> {
  // Verify ownership
  const match = await getMatchById(supabase, userId, matchId, undefined);
  if (!match) {
    return false;
  }

  // Get all set IDs for this match
  const { data: sets } = await supabase
    .from("sets")
    .select("id")
    .eq("match_id", matchId)
    .eq("user_id", userId);

  const setIds = sets?.map(set => set.id) || [];

  // Get all point IDs for these sets
  const { data: points } = await supabase
    .from("points")
    .select("id")
    .in("set_id", setIds)
    .eq("user_id", userId);

  const pointIds = points?.map(point => point.id) || [];

  // Delete in reverse order (to handle foreign keys)

  // 1. Delete point tags (non-blocking)
  if (pointIds.length > 0) {
    await supabase
      .from("point_tags")
      .delete()
      .in("point_id", pointIds);
  }

  // 2. Delete points
  if (setIds.length > 0) {
    await supabase
      .from("points")
      .delete()
      .in("set_id", setIds);
  }

  // 3. Delete sets
  await supabase
    .from("sets")
    .delete()
    .eq("match_id", matchId);

  // 4. Delete AI reports (non-blocking)
  await supabase
    .from("matches_ai_reports")
    .delete()
    .eq("match_id", matchId);

  // 5. Delete public shares (non-blocking)
  await supabase
    .from("matches_public_share")
    .delete()
    .eq("match_id", matchId);

  // 6. Update analytics events (set match_id to null, non-blocking)
  await supabase
    .from("analytics_events")
    .update({ match_id: null })
    .eq("match_id", matchId);

  // 7. Delete match
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("id", matchId)
    .eq("user_id", userId);

  if (error) {
    throw new DatabaseError();
  }

  return true;
}

// =============================================================================
// PRIVATE HELPER FUNCTIONS
// =============================================================================

/**
 * Apply filters to a Supabase query
 */
function applyFilters(query: ReturnType<SupabaseClient["from"]>, filters: {
  player_name?: string;
  opponent_name?: string;
  status?: string;
}) {
  if (filters.player_name) {
    query = query.ilike("player_name", `%${filters.player_name}%`);
  }
  if (filters.opponent_name) {
    query = query.ilike("opponent_name", `%${filters.opponent_name}%`);
  }
  if (filters.status) {
    const statuses = filters.status.split(',');
    if (statuses.length === 1) {
      query = query.eq("status", filters.status);
    } else {
      query = query.in("status", statuses);
    }
  }
  return query;
}

/**
 * Parse sort parameter into column and direction
 * Format: "-field" for descending, "field" for ascending
 */
function parseSortParam(sort: string): { column: string; ascending: boolean } {
  const ascending = !sort.startsWith("-");
  const column = ascending ? sort : sort.substring(1);

  // Validate allowed sort fields
  const allowedFields = [
    "started_at", "ended_at", "created_at", "player_name", "opponent_name",
  ];

  if (!allowedFields.includes(column)) {
    throw new ApiError("VALIDATION_ERROR", `Invalid sort field: ${column}`, 422);
  }

  return { column, ascending };
}

/**
 * Parse include parameter into options object
 */
function parseIncludeParam(include?: string): {
  sets: boolean;
  points: boolean;
  tags: boolean;
  ai_report: boolean;
} {
  const options = {
    sets: false,
    points: false,
    tags: false,
    ai_report: false,
  };

  if (!include) {
    return options;
  }

  const includes = include.split(",").map(s => s.trim());
  includes.forEach(item => {
    if (item in options) {
      options[item as keyof typeof options] = true;
    }
  });

  return options;
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

function mapMatchToMatchListItemDto(match: Match): MatchListItemDto {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...dto } = match;
  return dto;
}

function mapMatchToMatchDetailDto(
  match: Match,
  currentSet?: CurrentSetDto | null,
  sets?: SetDetailDto[],
  aiReport?: AiReportDto | null,
): MatchDetailDto {
  const dto = mapMatchToMatchListItemDto(match) as MatchDetailDto;
  if (currentSet) dto.current_set = currentSet;
  if (sets) dto.sets = sets;
  if (aiReport) dto.ai_report = aiReport;
  return dto;
}

function mapMatchToCreateMatchDto(match: Match, currentSet: CurrentSetDto): CreateMatchDto {
  const dto = mapMatchToMatchListItemDto(match) as CreateMatchDto;
  dto.current_set = currentSet;
  return dto;
}

function mapMatchToUpdateMatchDto(match: Match): UpdateMatchDto {
  return {
    id: match.id,
    player_name: match.player_name,
    opponent_name: match.opponent_name,
    coach_notes: match.coach_notes,
    updated_at: new Date().toISOString(),
  };
}

function mapMatchToFinishMatchDto(match: MatchDetailDto): FinishMatchDto {
  return {
    id: match.id,
    status: match.status as "finished",
    sets_won_player: match.sets_won_player,
    sets_won_opponent: match.sets_won_opponent,
    ended_at: match.ended_at as string,
    ai_report_status: match.ai_report?.ai_status || null,
  };
}
