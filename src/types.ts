/**
 * DTO (Data Transfer Object) and Command Model types for Spin Flow API
 *
 * This file contains all types used for API requests and responses.
 * All types are derived from database entity types defined in database.types.ts
 */

import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./db/database.types";

// =============================================================================
// BASE ENTITY TYPES (from database)
// =============================================================================

export type Match = Tables<"matches">;
export type MatchInsert = TablesInsert<"matches">;
export type MatchUpdate = TablesUpdate<"matches">;

export type Set = Tables<"sets">;
export type SetInsert = TablesInsert<"sets">;
export type SetUpdate = TablesUpdate<"sets">;

export type Point = Tables<"points">;
export type PointInsert = TablesInsert<"points">;
export type PointUpdate = TablesUpdate<"points">;

export type Tag = Tables<"tags">;
export type TagInsert = TablesInsert<"tags">;
export type TagUpdate = TablesUpdate<"tags">;

export type PointTag = Tables<"point_tags">;
export type PointTagInsert = TablesInsert<"point_tags">;

export type MatchAiReport = Tables<"matches_ai_reports">;
export type MatchAiReportInsert = TablesInsert<"matches_ai_reports">;
export type MatchAiReportUpdate = TablesUpdate<"matches_ai_reports">;

export type MatchPublicShare = Tables<"matches_public_share">;
export type MatchPublicShareInsert = TablesInsert<"matches_public_share">;

export type AnalyticsEvent = Tables<"analytics_events">;
export type AnalyticsEventInsert = TablesInsert<"analytics_events">;

export type DicLookupLabel = Tables<"dic_lookup_labels">;

// =============================================================================
// ENUMS
// =============================================================================

export type SideEnum = Enums<"side_enum">;
export type MatchStatusEnum = Enums<"match_status_enum">;
export type AiStatusEnum = Enums<"ai_status_enum">;
export type AnalyticsEventTypeEnum = Enums<"analytics_event_type_enum">;

// =============================================================================
// ENUM VALUES FOR ZOD VALIDATION
// =============================================================================

/**
 * Enum value arrays for Zod validation
 * Use in schemas: z.enum(MATCH_STATUS_VALUES)
 */
export const MATCH_STATUS_VALUES = [
  "in_progress",
  "finished",
] as const satisfies readonly MatchStatusEnum[];
export const SIDE_VALUES = [
  "player",
  "opponent",
] as const satisfies readonly SideEnum[];
export const AI_STATUS_VALUES = [
  "pending",
  "success",
  "error",
] as const satisfies readonly AiStatusEnum[];
export const ANALYTICS_EVENT_TYPE_VALUES = [
  "login",
  "match_created",
  "match_finished",
] as const satisfies readonly AnalyticsEventTypeEnum[];

// =============================================================================
// MATCH DTOs
// =============================================================================

/**
 * Current set information for in-progress matches
 * Includes current server information calculated from serving rules
 * and action flags calculated by backend
 */
export interface CurrentSetDto {
  id: number;
  sequence_in_match: number;
  is_golden: boolean;
  set_score_player: number;
  set_score_opponent: number;
  is_finished: boolean;
  current_server: SideEnum;
  can_undo_point: boolean;
  can_finish_set: boolean;
  can_finish_match: boolean;
}

/**
 * Basic match DTO used in list responses
 * Omits nested relations for performance
 */
export type MatchListItemDto = Omit<Match, "user_id">;

/**
 * Detailed match DTO with optional nested relations
 * Used in single match GET responses
 */
export interface MatchDetailDto extends Omit<Match, "user_id"> {
  current_set?: CurrentSetDto | null;
  sets?: SetDetailDto[];
  ai_report?: AiReportDto | null;
}

/**
 * Request body for creating a new match (POST /api/matches)
 * Only includes required fields for match creation
 */
export interface CreateMatchCommandDto {
  player_name: string;
  opponent_name: string;
  max_sets: number;
  golden_set_enabled: boolean;
  first_server_first_set: SideEnum;
  generate_ai_summary: boolean;
}

/**
 * DTO for match creation response
 * Includes the created match and automatically generated first set
 */
export interface CreateMatchDto extends MatchDetailDto {
  current_set: CurrentSetDto;
}

/**
 * Request body for updating match metadata (PATCH /api/matches/{id})
 * Only allows updating specific fields
 */
export interface UpdateMatchCommandDto {
  player_name?: string;
  opponent_name?: string;
  coach_notes?: string | null;
}

/**
 * DTO for updated match response (PATCH /api/matches/{id})
 */
export interface UpdateMatchDto {
  id: number;
  player_name: string;
  opponent_name: string;
  coach_notes: string | null;
  updated_at: string;
}

/**
 * Request body for finishing a match (POST /api/matches/{id}/finish)
 */
export interface FinishMatchCommandDto {
  coach_notes?: string | null;
}

/**
 * DTO for finished match response
 */
export interface FinishMatchDto {
  id: number;
  status: MatchStatusEnum;
  sets_won_player: number;
  sets_won_opponent: number;
  ended_at: string;
  ai_report_status: AiStatusEnum | null;
}

// =============================================================================
// SET DTOs
// =============================================================================

/**
 * Point DTO with tag names (not full tag objects)
 * Used in nested responses
 */
export interface PointWithTagsDto extends Omit<Point, "user_id"> {
  tags: string[]; // Array of tag names
}

/**
 * Set detail DTO with optional nested points
 */
export interface SetDetailDto extends Omit<Set, "user_id"> {
  current_server?: SideEnum | null;
  points?: PointWithTagsDto[];
}

/**
 * Request body for finishing a set (POST /api/sets/{id}/finish)
 */
export interface FinishSetCommandDto {
  coach_notes?: string | null;
}

/**
 * DTO for finished set info
 */
export interface FinishedSetDto {
  id: number;
  is_finished: boolean;
  winner: SideEnum;
  set_score_player: number;
  set_score_opponent: number;
  finished_at: string;
}

/**
 * DTO for finish set response
 * Includes the finished set and the automatically created next set
 */
export interface FinishSetDto {
  finished_set: FinishedSetDto;
  next_set: CurrentSetDto;
}

// =============================================================================
// POINT DTOs
// =============================================================================

/**
 * Current state of a set after point operations
 * Used in point creation and undo responses
 * Includes action flags calculated by backend
 */
export interface SetStateDto {
  id: number;
  set_score_player: number;
  set_score_opponent: number;
  current_server: SideEnum;
  can_undo_point: boolean;
  can_finish_set: boolean;
  can_finish_match: boolean;
}

/**
 * Request body for adding a point (POST /api/sets/{setId}/points/create)
 */
export interface CreatePointCommandDto {
  scored_by: SideEnum;
  tag_ids?: number[];
}

/**
 * DTO for created point response
 * Includes the created point and updated set state
 */
export interface CreatePointDto extends PointWithTagsDto {
  set_state: SetStateDto;
}

/**
 * DTO for undo point response
 */
export interface UndoPointDto {
  deleted_point_id: number;
  set_state: SetStateDto;
}

// =============================================================================
// TAG DTOs
// =============================================================================

/**
 * Tag DTO (same as entity, no transformations needed)
 */
export type TagDto = Tag;

// =============================================================================
// AI REPORT DTOs
// =============================================================================

/**
 * AI Report DTO
 * Omits internal fields not relevant to API consumers
 */
export type AiReportDto = Omit<MatchAiReport, "user_id">;

// =============================================================================
// PUBLIC SHARING DTOs
// =============================================================================

/**
 * DTO for public share link (POST /api/matches/{matchId}/share)
 * Token is base64url encoded (43 chars, 256 bits entropy)
 */
export interface PublicShareDto {
  id: number;
  match_id: number;
  public_url: string; // Full URL: https://spin-flow.app/public/matches/{token}
  token: string; // base64url token (43 characters)
  created_at: string;
}

/**
 * DTO for public AI report (simplified version)
 */
export interface PublicAiReportDto {
  ai_status: AiStatusEnum;
  ai_summary: string | null;
  ai_recommendations: string | null;
}

/**
 * DTO for public set view (with points)
 */
export interface PublicSetDto extends Omit<Set, "user_id"> {
  points: PointWithTagsDto[];
}

/**
 * DTO for public match view (GET /api/public/matches/{token})
 * Used for unauthenticated access to finished matches
 */
export interface PublicMatchDto {
  match: Omit<Match, "user_id" | "generate_ai_summary">;
  sets: PublicSetDto[];
  ai_report: PublicAiReportDto | null;
}

// =============================================================================
// DICTIONARY DTOs
// =============================================================================

/**
 * Dictionary label DTO (same as entity)
 */
export type DictionaryLabelDto = DicLookupLabel;

// =============================================================================
// ANALYTICS DTOs
// =============================================================================

/**
 * Request body for creating analytics event (POST /api/analytics/events)
 * Internal API - requires service role
 */
export interface CreateAnalyticsEventCommandDto {
  user_id: string;
  type: AnalyticsEventTypeEnum;
  match_id?: number | null;
}

// =============================================================================
// PAGINATION DTOs
// =============================================================================

/**
 * Simplified pagination metadata for server-side pagination
 * Used in all paginated list responses
 *
 * Backend returns only the total count of records.
 * Client is responsible for managing current page, page size, and calculating total pages.
 */
export interface PaginationDto {
  total: number;
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponseDto<T> {
  data: T[];
  pagination: PaginationDto;
}

// =============================================================================
// COMMON RESPONSE WRAPPERS
// =============================================================================

/**
 * Generic single item response wrapper
 * Wraps a single DTO in a standard { data: ... } envelope
 *
 * @example
 * // GET /api/matches/{id}
 * type MatchResponse = SingleItemResponseDto<MatchDetailDto>;
 * // Returns: { data: MatchDetailDto }
 *
 * // POST /api/matches
 * type CreateMatchResponse = SingleItemResponseDto<CreateMatchDto>;
 * // Returns: { data: CreateMatchDto }
 */
export interface SingleItemResponseDto<T> {
  data: T;
}

/**
 * Generic list response wrapper (without pagination)
 * Wraps an array of DTOs in a standard { data: [...] } envelope
 *
 * @example
 * // GET /api/tags
 * type TagListResponse = ListResponseDto<TagDto>;
 * // Returns: { data: TagDto[] }
 *
 * // GET /api/matches/{matchId}/sets
 * type SetListResponse = ListResponseDto<SetDetailDto>;
 * // Returns: { data: SetDetailDto[] }
 */
export interface ListResponseDto<T> {
  data: T[];
}

// =============================================================================
// FINAL API RESPONSE TYPES
// =============================================================================

/**
 * Final response types for all API endpoints
 * These combine DTOs with appropriate response wrappers
 */

// --- Match Endpoints ---

/** GET /api/matches */
export type MatchListResponse = PaginatedResponseDto<MatchListItemDto>;

/** POST /api/matches */
export type CreateMatchResponse = SingleItemResponseDto<CreateMatchDto>;

/** GET /api/matches/{id} */
export type MatchDetailResponse = SingleItemResponseDto<MatchDetailDto>;

/** PATCH /api/matches/{id} */
export type UpdateMatchResponse = SingleItemResponseDto<UpdateMatchDto>;

/** POST /api/matches/{id}/finish */
export type FinishMatchResponse = SingleItemResponseDto<FinishMatchDto>;

/** DELETE /api/matches/{id} - Returns 204 No Content (no response body) */

// --- Set Endpoints ---

/** GET /api/matches/{matchId}/sets */
export type SetListResponse = ListResponseDto<SetDetailDto>;

/** GET /api/sets/{id} */
export type SetDetailResponse = SingleItemResponseDto<SetDetailDto>;

/** POST /api/sets/{id}/finish */
export type FinishSetResponse = SingleItemResponseDto<FinishSetDto>;

// --- Point Endpoints ---

/** GET /api/sets/{setId}/points */
export type PointListResponse = ListResponseDto<PointWithTagsDto>;

/** POST /api/sets/{setId}/points/create */
export type CreatePointResponse = SingleItemResponseDto<CreatePointDto>;

/** DELETE /api/sets/{setId}/points/delete */
export type UndoPointResponse = SingleItemResponseDto<UndoPointDto>;

// --- Tag Endpoints ---

/** GET /api/tags */
export type TagListResponse = ListResponseDto<TagDto>;

// --- AI Report Endpoints ---

/** GET /api/matches/{matchId}/ai-report */
export type AiReportResponse = SingleItemResponseDto<AiReportDto>;

// --- Public Sharing Endpoints ---

/** POST /api/matches/{matchId}/share */
export type CreatePublicShareResponse = SingleItemResponseDto<PublicShareDto>;

/** GET /api/public/matches/{token} */
export type PublicMatchResponse = SingleItemResponseDto<PublicMatchDto>;

// --- Dictionary Endpoints ---

/** GET /api/dictionary/labels */
export type DictionaryLabelsResponse = ListResponseDto<DictionaryLabelDto>;

// --- Analytics Endpoints ---

/** POST /api/analytics/events - Returns 201 Created (no response body) */

// =============================================================================
// ERROR DTOs
// =============================================================================

/**
 * Validation error detail
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
}

/**
 * Standard error response
 */
export interface ErrorResponseDto {
  error: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

// =============================================================================
// QUERY PARAMETER DTOs
// =============================================================================

/**
 * Query parameters for GET /api/matches
 */
export interface MatchListQueryDto {
  page?: number;
  limit?: number;
  player_name?: string;
  opponent_name?: string;
  status?: MatchStatusEnum;
  sort?: string;
}

/**
 * Query parameters for GET /api/matches/{id} and related endpoints
 * Supports including nested relations
 */
export interface IncludeQueryDto {
  include?: string; // Comma-separated: "sets", "points", "tags", "ai_report"
}

/**
 * Query parameters for GET /api/dictionary/labels
 */
export interface DictionaryQueryDto {
  domain?: string;
}

// =============================================================================
// TYPE USAGE EXAMPLES & PATTERNS
// =============================================================================

/**
 * Example: How to use response types with DTOs
 *
 * Pattern: Use predefined Response types from "FINAL API RESPONSE TYPES" section
 *
 * GOOD EXAMPLES:
 *
 * 1. GET /api/matches (paginated list)
 *    type Response = MatchListResponse
 *    Returns: { data: MatchListItemDto[], pagination: {...} }
 *
 * 2. GET /api/matches/{id} (single item)
 *    type Response = MatchDetailResponse
 *    Returns: { data: MatchDetailDto }
 *
 * 3. POST /api/matches (create)
 *    type Request = CreateMatchCommandDto
 *    type Response = CreateMatchResponse
 *    Returns: { data: CreateMatchDto }
 *
 * 4. POST /api/matches/{id}/finish
 *    type Request = FinishMatchCommandDto
 *    type Response = FinishMatchResponse
 *    Returns: { data: FinishMatchDto }
 *
 * 5. GET /api/tags (simple list)
 *    type Response = TagListResponse
 *    Returns: { data: TagDto[] }
 *
 * 6. GET /api/public/matches/{token}
 *    type Response = PublicMatchResponse
 *    Returns: { data: PublicMatchDto }
 *
 * BAD EXAMPLES (DO NOT DO THIS):
 *
 * ❌ Embedding 'data' in DTO itself
 *    interface BadDto { data: { ... } }
 *
 * ❌ Using DTO directly as response without wrapper
 *    type BadResponse = MatchDetailDto // Missing { data: ... } wrapper
 *
 * ❌ Creating inline response types instead of using predefined ones
 *    type BadResponse = SingleItemResponseDto<MatchDetailDto> // Use MatchDetailResponse instead
 *
 * ✅ CORRECT: Always use predefined Response types
 *    type GoodResponse = MatchDetailResponse
 */

// =============================================================================
// AUTHENTICATION DTOs
// =============================================================================

/**
 * User DTO for authentication
 * Simplified user information from Supabase Auth
 */
export interface UserDto {
  id: string;
  email: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

/**
 * Session DTO for authentication
 */
export interface SessionDto {
  user: UserDto;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

/**
 * Login request DTO
 */
export interface LoginRequestDto {
  provider: "google" | "facebook"; // Google lub Facebook
  redirectUrl?: string;
}

/**
 * Login response DTO
 */
export interface LoginResponseDto {
  url: string; // OAuth URL do przekierowania
}

// --- Auth API Response Types ---

/** POST /api/auth/login */
export type LoginResponse = SingleItemResponseDto<LoginResponseDto>;

/** GET /api/auth/session */
export interface SessionResponse {
  data: {
    user: UserDto | null;
  };
}