-- Initial setup: Enable extensions and create custom types
-- Migration: 20241201000001_initial_setup.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('super_admin', 'league_admin', 'team_owner', 'public');
CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'finished', 'cancelled');