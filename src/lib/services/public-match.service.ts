import type { SupabaseClient } from "../../db/supabase.client";
import type {
  PublicMatchDto,
  Match,
  MatchAiReport,
  PublicAiReportDto,
  PublicSetDto,
  PointWithTagsDto,
  SideEnum,
  Set,
  Point,
} from "../../types";
import { ApiError } from "../utils/api-errors";

// Types for nested select results
type NestedPoint = Point & {
  point_tags?: Array<{ tags: { name: string } | null }>;
};

type NestedSet = Set & {
  points?: NestedPoint[];
};

/**
 * Get public match data by token (unauthenticated access)
 * @param supabase - Supabase client (service role for public access)
 * @param token - Public share token
 * @returns Public match data DTO
 */
export async function getPublicMatchByToken(
  supabase: SupabaseClient,
  token: string,
): Promise<PublicMatchDto> {
  // Token lookup - get match_id from public share
  const { data: share, error: shareError } = await supabase
    .from("matches_public_share")
    .select("match_id")
    .eq("token", token)
    .single();

  if (shareError || !share) {
    throw new ApiError("NOT_FOUND", "Shared match not found", 404);
  }

  const matchId = share.match_id;

  // Get match data - throw same error to prevent enumeration
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (matchError || !match) {
    throw new ApiError("NOT_FOUND", "Shared match not found", 404);
  }

  // Optimized nested select for sets and points with tags
  const { data: setsData, error: setsError } = await supabase
    .from("sets")
    .select(`
      *,
      points(
        *,
        point_tags(tags(name))
      )
    `)
    .eq("match_id", matchId)
    .order("sequence_in_match", { ascending: true })
    .order("sequence_in_set", { ascending: true, foreignTable: "points" });

  if (setsError) {
    throw new ApiError("NOT_FOUND", "Shared match not found", 404);
  }

  // Get AI report if exists
  const { data: aiReport } = await supabase
    .from("matches_ai_reports")
    .select("*")
    .eq("match_id", matchId)
    .single();

  // Transform to public DTOs
  const publicMatch = mapToPublicMatch(match);
  const publicSets = (setsData || []).map(set => mapToPublicSet(set));
  const publicAiReport = mapToPublicAIReportDto(aiReport);

  return {
    match: publicMatch,
    sets: publicSets,
    ai_report: publicAiReport,
  };
}

// =============================================================================
// MAPPING FUNCTIONS
// =============================================================================

/**
 * Map Match to PublicMatch (remove sensitive fields)
 */
function mapToPublicMatch(match: Match): Omit<Match, "user_id" | "generate_ai_summary"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, generate_ai_summary, ...publicMatch } = match;
  return publicMatch;
}

/**
 * Map Set with Points to Public Set DTO
 */
function mapToPublicSet(setData: NestedSet): PublicSetDto {
  // Transform points with tags to PointWithTagsDto format
  const points: PointWithTagsDto[] = (setData.points || []).map((point) => {
    // Transform point_tags to tags array
    const tagNames = (point.point_tags || []).map((pt) => pt.tags?.name).filter((name): name is string => Boolean(name));

    return {
      id: point.id,
      set_id: point.set_id,
      sequence_in_set: point.sequence_in_set,
      scored_by: point.scored_by as SideEnum,
      served_by: point.served_by as SideEnum,
      created_at: point.created_at,
      tags: tagNames,
    };
  });

  return {
    id: setData.id,
    match_id: setData.match_id,
    sequence_in_match: setData.sequence_in_match,
    is_golden: setData.is_golden,
    set_score_player: setData.set_score_player,
    set_score_opponent: setData.set_score_opponent,
    winner: setData.winner as SideEnum | null,
    is_finished: setData.is_finished,
    coach_notes: setData.coach_notes,
    created_at: setData.created_at,
    finished_at: setData.finished_at,
    points,
  };
}

/**
 * Map AI Report to Public AI Report DTO
 */
function mapToPublicAIReportDto(
  report: MatchAiReport | null,
): PublicAiReportDto | null {
  if (!report) {
    return null;
  }

  return {
    ai_status: report.ai_status,
    ai_summary: report.ai_summary,
    ai_recommendations: report.ai_recommendations,
  };
}
