-- Migration: Create Point Tags Table
-- Created: 2025-11-26 12:00:07 UTC
-- Description: Create junction table for points-tags many-to-many relationship
-- Tables: point_tags
-- Security: RLS enabled with user ownership policies
-- Dependencies: points, tags tables
-- Notes: Composite primary key (point_id, tag_id) for M:N relationship

-- Junction table for many-to-many relationship between points and tags
-- Includes user ownership for proper data isolation
create table point_tags (
    point_id bigint not null, -- FK to points(id), no cascade
    tag_id bigint not null, -- FK to tags(id), no cascade
    user_id uuid not null, -- FK to auth.users.id with cascade on delete
    created_at timestamptz not null default now(),
    primary key (point_id, tag_id)
);

-- Add foreign key constraints
alter table point_tags add constraint point_tags_point_id_fkey
    foreign key (point_id) references points(id);

alter table point_tags add constraint point_tags_tag_id_fkey
    foreign key (tag_id) references tags(id);

alter table point_tags add constraint point_tags_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

-- Performance indexes for foreign keys
create index point_tags_tag_id_idx on point_tags (tag_id);
create index point_tags_point_id_idx on point_tags (point_id);

-- Enable row level security for user data isolation
alter table point_tags enable row level security;

-- Policies for point_tags table - users can only access tag relationships for their own points
create policy point_tags_select_own on point_tags
    for select using (user_id = auth.uid());

create policy point_tags_insert_own on point_tags
    for insert with check (user_id = auth.uid());

create policy point_tags_update_own on point_tags
    for update using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy point_tags_delete_own on point_tags
    for delete using (user_id = auth.uid());
