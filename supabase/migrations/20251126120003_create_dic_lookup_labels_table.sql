-- Migration: Create Dictionary Lookup Labels Table
-- Created: 2025-11-26 12:00:03 UTC
-- Description: Create lookup labels table for UI enum/code translations
-- Tables: dic_lookup_labels
-- Security: No RLS (global dictionary table)
-- Notes: Global dictionary for consistent labeling across the application

-- Lookup labels for UI display of enums and codes
-- Global dictionary for consistent labeling across the application
create table dic_lookup_labels (
    id bigserial primary key,
    domain varchar(100) not null,
    code varchar(50) not null,
    label varchar(100) not null
);

-- Seed data for enum labels
-- Insert labels for side_enum values
insert into dic_lookup_labels (domain, code, label) values
('match_side', 'player', 'Zawodnik oceniany'),
('match_side', 'opponent', 'Przeciwnik');

-- Insert labels for match_status_enum values
insert into dic_lookup_labels (domain, code, label) values
('match_status', 'in_progress', 'W trakcie'),
('match_status', 'finished', 'Zakończony');

-- Insert labels for analytics_event_type_enum values
insert into dic_lookup_labels (domain, code, label) values
('analytics_event_type', 'login', 'Logowanie'),
('analytics_event_type', 'match_created', 'Mecz utworzony'),
('analytics_event_type', 'match_finished', 'Mecz zakończony');

-- Insert labels for ai_status_enum values
insert into dic_lookup_labels (domain, code, label) values
('ai_status', 'pending', 'Oczekujący'),
('ai_status', 'success', 'Zakończony'),
('ai_status', 'error', 'Błąd');