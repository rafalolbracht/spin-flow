-- Enable RLS and create policies for authenticated users
-- Migration: 20251229000001_enable_auth_rls_policies

-- Enable RLS on all tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches_ai_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches_public_share ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE dic_lookup_labels ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- MATCHES POLICIES
-- =============================================================================

-- Users can view their own matches
CREATE POLICY matches_select_own ON matches
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own matches
CREATE POLICY matches_insert_own ON matches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own matches
CREATE POLICY matches_update_own ON matches
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own matches
CREATE POLICY matches_delete_own ON matches
FOR DELETE
USING (auth.uid() = user_id);

-- Public access to shared matches is handled at application level
-- via /api/public/matches/[token] endpoint, not through RLS policies

-- =============================================================================
-- SETS POLICIES
-- =============================================================================

-- Users can view sets of their own matches
CREATE POLICY sets_select_own ON sets
FOR SELECT
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can create sets for their own matches
CREATE POLICY sets_insert_own ON sets
FOR INSERT
WITH CHECK (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can update sets of their own matches
CREATE POLICY sets_update_own ON sets
FOR UPDATE
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can delete sets of their own matches
CREATE POLICY sets_delete_own ON sets
FOR DELETE
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- POINTS POLICIES
-- =============================================================================

-- Users can view points of their own matches
CREATE POLICY points_select_own ON points
FOR SELECT
USING (
  set_id IN (
    SELECT s.id FROM sets s
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Users can create points for their own matches
CREATE POLICY points_insert_own ON points
FOR INSERT
WITH CHECK (
  set_id IN (
    SELECT s.id FROM sets s
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Users can update points of their own matches
CREATE POLICY points_update_own ON points
FOR UPDATE
USING (
  set_id IN (
    SELECT s.id FROM sets s
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Users can delete points of their own matches
CREATE POLICY points_delete_own ON points
FOR DELETE
USING (
  set_id IN (
    SELECT s.id FROM sets s
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- =============================================================================
-- POINT TAGS POLICIES
-- =============================================================================

-- Users can view point tags of their own matches
CREATE POLICY point_tags_select_own ON point_tags
FOR SELECT
USING (
  point_id IN (
    SELECT p.id FROM points p
    JOIN sets s ON p.set_id = s.id
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Users can create point tags for their own matches
CREATE POLICY point_tags_insert_own ON point_tags
FOR INSERT
WITH CHECK (
  point_id IN (
    SELECT p.id FROM points p
    JOIN sets s ON p.set_id = s.id
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- Users can delete point tags of their own matches
CREATE POLICY point_tags_delete_own ON point_tags
FOR DELETE
USING (
  point_id IN (
    SELECT p.id FROM points p
    JOIN sets s ON p.set_id = s.id
    JOIN matches m ON s.match_id = m.id
    WHERE m.user_id = auth.uid()
  )
);

-- =============================================================================
-- AI REPORTS POLICIES
-- =============================================================================

-- Users can view AI reports of their own matches
CREATE POLICY matches_ai_reports_select_own ON matches_ai_reports
FOR SELECT
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can create AI reports for their own matches
CREATE POLICY matches_ai_reports_insert_own ON matches_ai_reports
FOR INSERT
WITH CHECK (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can update AI reports of their own matches
CREATE POLICY matches_ai_reports_update_own ON matches_ai_reports
FOR UPDATE
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can delete AI reports of their own matches
CREATE POLICY matches_ai_reports_delete_own ON matches_ai_reports
FOR DELETE
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- PUBLIC SHARE POLICIES
-- =============================================================================

-- Users can view their own share links
CREATE POLICY matches_public_share_select_own ON matches_public_share
FOR SELECT
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can create share links for their own matches
CREATE POLICY matches_public_share_insert_own ON matches_public_share
FOR INSERT
WITH CHECK (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- Users can delete their own share links
CREATE POLICY matches_public_share_delete_own ON matches_public_share
FOR DELETE
USING (
  match_id IN (
    SELECT id FROM matches WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- ANALYTICS EVENTS POLICIES
-- =============================================================================

-- Users can create analytics events for themselves
CREATE POLICY analytics_events_insert_own ON analytics_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own analytics events
CREATE POLICY analytics_events_select_own ON analytics_events
FOR SELECT
USING (auth.uid() = user_id);

-- Admin can view all analytics events (optional - for admin users)
-- CREATE POLICY analytics_events_select_admin ON analytics_events
-- FOR SELECT
-- USING (auth.role() = 'service_role');

-- =============================================================================
-- TAGS POLICIES (SHARED DATA)
-- =============================================================================

-- All authenticated users can view tags (shared reference data)
CREATE POLICY tags_select_authenticated ON tags
FOR SELECT
USING (auth.role() = 'authenticated');

-- =============================================================================
-- DIC LOOKUP LABELS POLICIES (SHARED DATA)
-- =============================================================================

-- Everyone can view lookup labels (public reference data)
CREATE POLICY dic_lookup_labels_select_all ON dic_lookup_labels
FOR SELECT
USING (true);
