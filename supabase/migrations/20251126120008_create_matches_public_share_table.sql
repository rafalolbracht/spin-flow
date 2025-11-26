-- Migration: Create Matches Public Share Table
-- Created: 2025-11-26 12:00:08 UTC
-- Description: Create public sharing tokens table for match access
-- Tables: matches_public_share
-- Security: RLS enabled with user ownership policies
-- Dependencies: matches table
-- Notes: One-to-one relationship with matches, secure token-based sharing

-- Public sharing tokens for matches - secure token-based access
-- One share link per match for public viewing
create table matches_public_share (
    id bigserial primary key,
    match_id bigint not null unique, -- FK to matches(id), no cascade
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    token varchar(64) not null unique, -- SHA-256 hex hash of the actual token
    created_at timestamptz not null default now()
);

-- Add foreign key constraints
alter table matches_public_share add constraint matches_public_share_match_id_fkey
    foreign key (match_id) references matches(id);

alter table matches_public_share add constraint matches_public_share_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Unique indexes for business logic constraints
create unique index matches_public_share_match_id_idx on matches_public_share (match_id);
create unique index matches_public_share_token_idx on matches_public_share (token);

-- Enable row level security for user data isolation
alter table matches_public_share enable row level security;

-- Policies for matches_public_share table - users can only access share links for their own matches
create policy matches_public_share_select_own on matches_public_share
    for select using (user_id = auth.uid());

create policy matches_public_share_insert_own on matches_public_share
    for insert with check (user_id = auth.uid());

create policy matches_public_share_update_own on matches_public_share
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy matches_public_share_delete_own on matches_public_share
    for delete using (user_id = auth.uid());
