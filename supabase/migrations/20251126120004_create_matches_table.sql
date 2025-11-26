-- Migration: Create Matches Table
-- Created: 2025-11-26 12:00:04 UTC
-- Description: Create core matches table with ownership-based security
-- Tables: matches
-- Security: RLS enabled with user ownership policies
-- Notes: Central entity for tennis matches, foundation for all other tables

-- Core match table - central entity for tennis matches
-- Stores match configuration and current state with denormalized scores
create table matches (
    id bigserial primary key,
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    player_name varchar(200) not null,
    opponent_name varchar(200) not null,
    max_sets int not null check (max_sets > 0),
    golden_set_enabled boolean not null,
    first_server_first_set side_enum not null,
    generate_ai_summary boolean not null,
    sets_won_player smallint not null,
    sets_won_opponent smallint not null,
    status match_status_enum not null,
    coach_notes text null,
    started_at timestamptz not null default now(),
    ended_at timestamptz null,
    created_at timestamptz not null default now()
);

-- Add foreign key constraint for user ownership
alter table matches add constraint matches_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Enable row level security for user data isolation
alter table matches enable row level security;

-- Policies for matches table - users can only access their own matches
create policy matches_select_own on matches
    for select using (user_id = auth.uid());

create policy matches_insert_own on matches
    for insert with check (user_id = auth.uid());

create policy matches_update_own on matches
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy matches_delete_own on matches
    for delete using (user_id = auth.uid());
