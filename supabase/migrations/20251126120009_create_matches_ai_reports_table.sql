-- Migration: Create Matches AI Reports Table
-- Created: 2025-11-26 12:00:09 UTC
-- Description: Create AI-generated reports and recommendations table
-- Tables: matches_ai_reports
-- Security: RLS enabled with user ownership policies
-- Dependencies: matches table
-- Notes: One-to-one relationship with matches, stores AI processing results

-- AI-generated reports and recommendations - one per match
-- Stores AI processing status and generated content for analysis
create table matches_ai_reports (
    id bigserial primary key,
    match_id bigint not null unique, -- FK to matches(id), no cascade
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    ai_status ai_status_enum not null,
    ai_summary text null,
    ai_recommendations text null,
    ai_error text null,
    ai_generated_at timestamptz null,
    created_at timestamptz not null default now()
);

-- Add foreign key constraints
alter table matches_ai_reports add constraint matches_ai_reports_match_id_fkey
    foreign key (match_id) references matches(id);

alter table matches_ai_reports add constraint matches_ai_reports_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Unique index for business logic constraint
create unique index matches_ai_reports_match_id_idx on matches_ai_reports (match_id);

-- Enable row level security for user data isolation
alter table matches_ai_reports enable row level security;

-- Policies for matches_ai_reports table - users can only access AI reports for their own matches
create policy matches_ai_reports_select_own on matches_ai_reports
    for select using (user_id = auth.uid());

create policy matches_ai_reports_insert_own on matches_ai_reports
    for insert with check (user_id = auth.uid());

create policy matches_ai_reports_update_own on matches_ai_reports
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy matches_ai_reports_delete_own on matches_ai_reports
    for delete using (user_id = auth.uid());
