-- Fix tags RLS policy to allow anon access
-- Migration: 20251229000002_fix_tags_rls_policy
-- Description: Allow both authenticated and anonymous users to read tags
-- Previous policy only allowed authenticated users, but tags are shared reference data

-- Drop existing policy
DROP POLICY IF EXISTS tags_select_authenticated ON tags;

-- Create new policy that allows both authenticated and anonymous users
CREATE POLICY tags_select_all ON tags
FOR SELECT
USING (true);

-- Note: Tags are read-only reference data shared across all users
-- Write operations (INSERT, UPDATE, DELETE) are restricted to admin/service role only

