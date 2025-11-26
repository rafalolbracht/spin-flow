-- Migration: Create ENUM Types
-- Created: 2025-11-26 12:00:01 UTC
-- Description: Create custom enum types for data consistency and validation
-- Tables: None (types only)
-- Security: No RLS impact
-- Notes: Enums must be created before any tables that use them

-- Create enum types for consistent data validation across the application
-- These enums ensure data integrity and provide type safety

create type side_enum as enum ('player', 'opponent');

create type match_status_enum as enum ('in_progress', 'finished');

create type analytics_event_type_enum as enum ('login', 'match_created', 'match_finished');

create type ai_status_enum as enum ('pending', 'success', 'error');
