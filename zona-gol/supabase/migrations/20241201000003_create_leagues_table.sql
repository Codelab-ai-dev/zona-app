-- Create leagues table
-- Migration: 20241201000003_create_leagues_table.sql

-- Leagues table
CREATE TABLE leagues (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  logo TEXT,
  admin_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_leagues_slug ON leagues(slug);
CREATE INDEX idx_leagues_admin_id ON leagues(admin_id);
CREATE INDEX idx_leagues_is_active ON leagues(is_active);
CREATE INDEX idx_leagues_created_at ON leagues(created_at);

-- Enable RLS
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;