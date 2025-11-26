-- Migration: Create Points Table
-- Created: 2025-11-26 12:00:06 UTC
-- Description: Create points table for granular point tracking
-- Tables: points
-- Security: RLS enabled with user ownership policies
-- Dependencies: sets table
-- Notes: Minimal structure for performance, tracks who scored and served

-- Individual points within sets - granular tracking
-- Minimal structure optimized for performance and frequent inserts
create table points (
    id bigserial primary key,
    set_id bigint not null, -- FK to sets(id), no cascade
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    sequence_in_set smallint not null,
    scored_by side_enum not null,
    served_by side_enum not null,
    created_at timestamptz not null default now()
);

-- Add foreign key constraints
alter table points add constraint points_set_id_fkey
    foreign key (set_id) references sets(id);

alter table points add constraint points_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Performance index for foreign key
create index points_set_id_idx on points (set_id);

-- Enable row level security for user data isolation
alter table points enable row level security;

-- Policies for points table - users can only access points from their own matches
create policy points_select_own on points
    for select using (user_id = auth.uid());

create policy points_insert_own on points
    for insert with check (user_id = auth.uid());

create policy points_update_own on points
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy points_delete_own on points
    for delete using (user_id = auth.uid());
