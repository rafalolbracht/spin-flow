import { randomBytes } from "crypto";
import type { SupabaseClient } from "../../db/supabase.client";
import type {
  MatchPublicShare,
  MatchPublicShareInsert,
  PublicShareDto,
} from "../../types";
import { DatabaseError, ApiError } from "../utils/api-errors";

/**
 * Create or get existing public share link for a match
 * @param supabase - Supabase client
 * @param userId - User ID (DEFAULT_USER_ID in development)
 * @param matchId - Match ID
 * @returns Public share DTO and whether it was newly created
 */
export async function createOrGetPublicShare(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<{ dto: PublicShareDto; isNew: boolean }> {
  // Verify match ownership and status (must be finished)
  await verifyMatchOwnershipAndStatus(supabase, userId, matchId);

  // Check if public share already exists
  const existingShare = await getExistingPublicShare(supabase, userId, matchId);
  if (existingShare) {
    return {
      dto: mapToPublicShareDto(existingShare),
      isNew: false,
    };
  }

  // Create new public share
  const newShare = await createPublicShare(supabase, userId, matchId);
  return {
    dto: mapToPublicShareDto(newShare),
    isNew: true,
  };
}

// =============================================================================
// PRIVATE HELPER FUNCTIONS
// =============================================================================

/**
 * Verify that user owns the match and it's finished
 */
async function verifyMatchOwnershipAndStatus(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<void> {
  const { data: match, error } = await supabase
    .from("matches")
    .select("id, status, user_id")
    .eq("id", matchId)
    .eq("user_id", userId)
    .single();

  if (error || !match) {
    throw new ApiError("NOT_FOUND", "Match not found", 404);
  }

  if (match.status !== "finished") {
    throw new ApiError("VALIDATION_ERROR", "Match must be finished to create public share", 422);
  }
}

/**
 * Get existing public share if it exists
 */
async function getExistingPublicShare(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<MatchPublicShare | null> {
  const { data: share, error } = await supabase
    .from("matches_public_share")
    .select("*")
    .eq("match_id", matchId)
    .eq("user_id", userId)
    .single();

  if (error) {
    // If error is "not found", return null; otherwise throw
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new DatabaseError();
  }

  return share;
}

/**
 * Create new public share with secure token
 */
async function createPublicShare(
  supabase: SupabaseClient,
  userId: string,
  matchId: number,
): Promise<MatchPublicShare> {
  const token = generateSecureToken();

  const shareData: MatchPublicShareInsert = {
    match_id: matchId,
    user_id: userId,
    token,
    created_at: new Date().toISOString(),
  };

  const { data: share, error } = await supabase
    .from("matches_public_share")
    .insert(shareData)
    .select()
    .single();

  if (error) {
    throw new DatabaseError();
  }

  return share;
}

/**
 * Generate cryptographically secure token for public sharing
 * Uses 256 bits of entropy (32 bytes) encoded as base64url
 * Result: 43 characters, URL-safe, no padding
 */
function generateSecureToken(): string {
  const bytes = randomBytes(32); // 256 bits of entropy
  return bytes
    .toString("base64")
    .replace(/\+/g, "-") // URL-safe
    .replace(/\//g, "_") // URL-safe
    .replace(/=/g, ""); // Remove padding
}

/**
 * Map MatchPublicShare to PublicShareDto
 */
function mapToPublicShareDto(share: MatchPublicShare): PublicShareDto {
  // TODO: Get from environment variable in production
  const baseUrl = "https://spinflow.app";

  return {
    id: share.id,
    match_id: share.match_id,
    public_url: `${baseUrl}/public/matches/${share.token}`,
    token: share.token,
    created_at: share.created_at,
  };
}
