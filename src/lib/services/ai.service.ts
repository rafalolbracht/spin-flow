import type { SupabaseClient } from "../../db/supabase.client";
import type {
  AiReportDto,
  MatchAiReportInsert,
  MatchAiReportUpdate,
  Match,
  SetDetailDto,
  SideEnum,
} from "../../types";
import { DatabaseError } from "../utils/api-errors";
import { logError } from "../utils/logger";

/**
 * Create a new AI report record for a match
 * @param supabase - Supabase client
 * @param matchId - Match ID
 * @param userId - User ID (DEFAULT_USER_ID in development)
 */
export async function createAiReportRecord(
  supabase: SupabaseClient,
  matchId: number,
  userId: string,
): Promise<void> {
  const aiReportData: MatchAiReportInsert = {
    match_id: matchId,
    user_id: userId,
    ai_status: "pending",
    ai_summary: null,
    ai_recommendations: null,
    ai_error: null,
    ai_generated_at: null,
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("matches_ai_reports")
    .insert(aiReportData);

  if (error) {
    throw new DatabaseError();
  }
}

/**
 * Generate AI report for a match (fire-and-forget)
 * This function should be called without await to avoid blocking
 * @param supabase - Supabase client
 * @param matchId - Match ID
 */
export async function generateAiReport(
  supabase: SupabaseClient,
  matchId: number,
): Promise<void> {
  try {
    // Get match data with sets and points
    const matchData = await getMatchDataForAI(supabase, matchId);

    if (!matchData) {
      throw new Error(`Match ${matchId} not found`);
    }

    // TODO: Call OpenRouter API to generate AI report
    // For now, this is a placeholder that simulates AI generation
    const aiReport = await generateAIReportPlaceholder(matchData);

    // Update with success
    const successUpdate: MatchAiReportUpdate = {
      ai_status: "success",
      ai_summary: aiReport.summary,
      ai_recommendations: aiReport.recommendations,
      ai_generated_at: new Date().toISOString(),
    };

    await supabase
      .from("matches_ai_reports")
      .update(successUpdate)
      .eq("match_id", matchId);

  } catch (error) {
    // Update with error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorUpdate: MatchAiReportUpdate = {
      ai_status: "error",
      ai_error: errorMessage,
      ai_generated_at: new Date().toISOString(),
    };

    try {
      await supabase
        .from("matches_ai_reports")
        .update(errorUpdate)
        .eq("match_id", matchId);
    } catch (updateError) {
      // If even the error update fails, log it
      logError(
        "ai.service.generateAiReport",
        updateError instanceof Error ? updateError : new Error(String(updateError)),
        { matchId, originalError: errorMessage },
      );
    }

    // Log the original error
    logError(
      "ai.service.generateAiReport",
      error instanceof Error ? error : new Error(String(error)),
      { matchId },
    );
  }
}

/**
 * Get AI report for a match
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @returns AI report DTO or null if not found or not enabled
 */
export async function getAiReportByMatchId(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<AiReportDto | null> {
  // First verify match ownership and AI summary is enabled
  const { data: match } = await supabase
    .from("matches")
    .select("id, generate_ai_summary")
    .eq("id", matchId)
    .eq("user_id", userId)
    .single();

  if (!match || !match.generate_ai_summary) {
    return null;
  }

  // Get AI report
  const { data: aiReport } = await supabase
    .from("matches_ai_reports")
    .select("*")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .single();

  if (!aiReport) {
    return null;
  }

  // Remove user_id from response
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...reportWithoutUserId } = aiReport;
  return reportWithoutUserId;
}

// =============================================================================
// PRIVATE HELPER FUNCTIONS
// =============================================================================

/**
 * Get complete match data for AI report generation
 */
async function getMatchDataForAI(
  supabase: SupabaseClient,
  matchId: number,
): Promise<{ match: Match; sets: SetDetailDto[] } | null> {
  // Get match with sets and points in a single query
  const { data, error } = await supabase
    .from("matches")
    .select(`
      *,
      sets (
        *,
        points (
          *,
          point_tags(tags(name))
        )
      )
    `)
    .eq("id", matchId)
    .single();

  if (error || !data) {
    return null;
  }

  const match = data as Match & { sets: Array<{
    id: number;
    match_id: number;
    sequence_in_match: number;
    is_golden: boolean;
    set_score_player: number;
    set_score_opponent: number;
    winner: string | null;
    is_finished: boolean;
    coach_notes: string | null;
    created_at: string;
    finished_at: string | null;
    points?: Array<{
      id: number;
      set_id: number;
      sequence_in_set: number;
      scored_by: string;
      served_by: string;
      created_at: string;
      point_tags?: Array<{ tags: { name: string } | null }>;
    }>;
  }> };

  // Transform sets data to SetDetailDto format
  const sets: SetDetailDto[] = match.sets.map(set => ({
    id: set.id,
    match_id: set.match_id,
    sequence_in_match: set.sequence_in_match,
    is_golden: set.is_golden,
    set_score_player: set.set_score_player,
    set_score_opponent: set.set_score_opponent,
    winner: set.winner as SideEnum | null,
    is_finished: set.is_finished,
    coach_notes: set.coach_notes,
    created_at: set.created_at,
    finished_at: set.finished_at,
    points: set.points?.map((point) => ({
      id: point.id,
      set_id: point.set_id,
      sequence_in_set: point.sequence_in_set,
      scored_by: point.scored_by as SideEnum,
      served_by: point.served_by as SideEnum,
      created_at: point.created_at,
      tags: point.point_tags?.map((pt) => pt.tags?.name).filter((name): name is string => Boolean(name)) || [],
    })) || [],
  }));

  return {
    match: match as Match, // Keep original match object
    sets,
  };
}

/**
 * Placeholder AI report generation
 * TODO: Replace with actual OpenRouter API call
 */
async function generateAIReportPlaceholder(matchData: { match: Match; sets: SetDetailDto[] }): Promise<{
  summary: string;
  recommendations: string;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const { match, sets } = matchData;
  const totalPoints = sets.reduce((sum, set) => sum + (set.points?.length || 0), 0);
  const playerWins = sets.filter(set => set.winner === 'player').length;
  const opponentWins = sets.filter(set => set.winner === 'opponent').length;

  const summary = `Match between ${match.player_name} and ${match.opponent_name}. ` +
    `Final score: ${playerWins}-${opponentWins}. ` +
    `Total points played: ${totalPoints}. ` +
    `Match duration: ${sets.length} sets.`;

  const recommendations = `Focus on improving serve consistency. ` +
    `Work on transition game from defense to attack. ` +
    `Practice point construction with proper placement.`;

  return { summary, recommendations };
}
