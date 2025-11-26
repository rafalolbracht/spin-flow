-- Migration: Create Tags Table
-- Created: 2025-11-26 12:00:02 UTC
-- Description: Create global tags table for categorizing points
-- Tables: tags
-- Security: No RLS (global shared table)
-- Notes: This table is shared across all users, no ownership isolation needed

-- Global tags for categorizing points - shared across all users
-- Contains both system-defined and user-defined tags with ordering
create table tags (
    id bigserial primary key,
    name varchar(30) not null unique,
    is_system boolean not null,
    order_in_list smallint not null,
    created_at timestamptz not null default now()
);

-- Index for unique constraint and name lookups
create unique index tags_name_idx on tags (name);

-- Insert system-defined tags
insert into tags (name, is_system, order_in_list) values
    ('błąd serwisu', true, 1),
    ('błąd odbioru', true, 2),
    ('niewymuszony błąd', false, 3),
    ('świnka', false, 4),
    ('nieprzygotowany atak', false, 5),
    ('pasywna gra', false, 6),
    ('błąd przy siatce', false, 7),
    ('zła praca nóg', false, 8),
    ('za daleko od stołu', false, 9);