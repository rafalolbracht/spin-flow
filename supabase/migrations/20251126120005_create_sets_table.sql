-- Migration: Create Sets Table
-- Created: 2025-11-26 12:00:05 UTC
-- Description: Create sets table for tracking individual set progress
-- Tables: sets
-- Security: RLS enabled with user ownership policies
-- Dependencies: matches table
-- Notes: Tracks individual sets within matches with denormalized scores

-- Sets within a match - tracks individual set progress
-- Denormalized scores for fast queries and proper sequencing
create table sets (
    id bigserial primary key,
    match_id bigint not null, -- FK to matches(id), no cascade
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    sequence_in_match smallint not null,
    is_golden boolean not null,
    set_score_player smallint not null,
    set_score_opponent smallint not null,
    winner side_enum null,
    is_finished boolean not null,
    coach_notes text null,
    finished_at timestamptz null,
    created_at timestamptz not null default now()
);

-- Add foreign key constraints
alter table sets add constraint sets_match_id_fkey
    foreign key (match_id) references matches(id);

alter table sets add constraint sets_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Performance index for foreign key
create index sets_match_id_idx on sets (match_id);

-- Enable row level security for user data isolation
alter table sets enable row level security;

-- Policies for sets table - users can only access sets from their own matches
create policy sets_select_own on sets
    for select using (user_id = auth.uid());

create policy sets_insert_own on sets
    for insert with check (user_id = auth.uid());

create policy sets_update_own on sets
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy sets_delete_own on sets
    for delete using (user_id = auth.uid());
