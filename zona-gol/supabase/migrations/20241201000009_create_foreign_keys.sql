-- Add foreign key constraints that were forward referenced
-- Migration: 20241201000009_create_foreign_keys.sql

-- Add foreign key constraints to users table for league_id and team_id
ALTER TABLE users 
ADD CONSTRAINT users_league_id_fkey 
FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE SET NULL;

ALTER TABLE users 
ADD CONSTRAINT users_team_id_fkey 
FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;