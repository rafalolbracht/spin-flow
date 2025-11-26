-- Migration: Create Analytics Events Table
-- Created: 2025-11-26 12:00:10 UTC
-- Description: Create analytics events table for system monitoring
-- Tables: analytics_events
-- Security: RLS enabled, admin/service role only access
-- Dependencies: matches table (optional FK)
-- Notes: Admin-only table for business intelligence, accessed via service role

-- Analytics events for system monitoring - tracks user activity
-- Admin-only access for business intelligence and system monitoring
create table analytics_events (
    id bigserial primary key,
    user_id uuid null, -- FK to auth.users.id with set null on delete
    type analytics_event_type_enum not null,
    match_id bigint null, -- FK to matches(id), set null on delete
    created_at timestamptz not null default now()
);

-- Add foreign key constraints with set null on delete for data preservation
alter table analytics_events add constraint analytics_events_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

alter table analytics_events add constraint analytics_events_match_id_fkey
    foreign key (match_id) references matches(id) on delete set null;

-- Enable row level security for admin-only access
alter table analytics_events enable row level security;

-- Note: No user policies for analytics_events table
-- This table is accessed exclusively through service role (bypasses RLS)
-- Regular authenticated users cannot access this table
