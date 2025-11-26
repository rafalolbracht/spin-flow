-- Migration: Disable All RLS Policies
-- Created: 2025-11-26 12:00:11 UTC
-- Description: Disable row level security and drop all policies from all tables
-- Tables: matches, sets, points, point_tags, matches_public_share, matches_ai_reports, analytics_events
-- Security: Disables all RLS policies for development/testing purposes
-- Notes: This migration removes all user data isolation policies

-- Disable RLS and drop policies for matches table
alter table matches disable row level security;

drop policy if exists matches_select_own on matches;
drop policy if exists matches_insert_own on matches;
drop policy if exists matches_update_own on matches;
drop policy if exists matches_delete_own on matches;

-- Disable RLS and drop policies for sets table
alter table sets disable row level security;

drop policy if exists sets_select_own on sets;
drop policy if exists sets_insert_own on sets;
drop policy if exists sets_update_own on sets;
drop policy if exists sets_delete_own on sets;

-- Disable RLS and drop policies for points table
alter table points disable row level security;

drop policy if exists points_select_own on points;
drop policy if exists points_insert_own on points;
drop policy if exists points_update_own on points;
drop policy if exists points_delete_own on points;

-- Disable RLS and drop policies for point_tags table
alter table point_tags disable row level security;

drop policy if exists point_tags_select_own on point_tags;
drop policy if exists point_tags_insert_own on point_tags;
drop policy if exists point_tags_update_own on point_tags;
drop policy if exists point_tags_delete_own on point_tags;

-- Disable RLS and drop policies for matches_public_share table
alter table matches_public_share disable row level security;

drop policy if exists matches_public_share_select_own on matches_public_share;
drop policy if exists matches_public_share_insert_own on matches_public_share;
drop policy if exists matches_public_share_update_own on matches_public_share;
drop policy if exists matches_public_share_delete_own on matches_public_share;

-- Disable RLS and drop policies for matches_ai_reports table
alter table matches_ai_reports disable row level security;

drop policy if exists matches_ai_reports_select_own on matches_ai_reports;
drop policy if exists matches_ai_reports_insert_own on matches_ai_reports;
drop policy if exists matches_ai_reports_update_own on matches_ai_reports;
drop policy if exists matches_ai_reports_delete_own on matches_ai_reports;

-- Disable RLS for analytics_events table (no policies to drop)
alter table analytics_events disable row level security;
