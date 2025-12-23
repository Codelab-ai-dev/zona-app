-- Migration: Add age validation fields for tournaments and player ID verification
-- Date: 2024-12-22
-- Description: Adds fields to support age-based player registration rules and INE verification

-- =====================================================
-- TOURNAMENTS: Age validation configuration
-- =====================================================

-- Enable age validation for the tournament
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_validation_enabled BOOLEAN DEFAULT FALSE;

-- Minimum age required (e.g., 40 for "mayores de 40")
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS min_age INTEGER;

-- Maximum age allowed (e.g., 18 for "juvenil sub-18")
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS max_age INTEGER;

-- Reference date for calculating age (usually tournament start date)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_reference_date DATE;

-- Number of exceptions allowed (e.g., 3 players outside age range)
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_exception_count INTEGER DEFAULT 0;

-- Minimum age for exceptions (e.g., 37 for "refuerzos mayores de 37")
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_exception_min_age INTEGER;

-- Maximum age for exceptions
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS age_exception_max_age INTEGER;

-- Whether ID document upload is required for registration
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS id_document_required BOOLEAN DEFAULT FALSE;

-- =====================================================
-- PLAYERS: ID verification fields
-- =====================================================

-- URL to the uploaded ID document (stored in Supabase Storage)
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_document_url TEXT;

-- Whether the player's identity has been verified
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;

-- Timestamp of when verification occurred
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_verified_at TIMESTAMPTZ;

-- Who verified the player (for manual override)
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_verified_by UUID REFERENCES users(id);

-- Verification method: 'automatic' (Groq Vision) or 'manual' (admin override)
ALTER TABLE players ADD COLUMN IF NOT EXISTS id_verification_method TEXT CHECK (id_verification_method IN ('automatic', 'manual'));

-- Name extracted from ID document (for comparison)
ALTER TABLE players ADD COLUMN IF NOT EXISTS extracted_name TEXT;

-- CURP extracted from ID document
ALTER TABLE players ADD COLUMN IF NOT EXISTS extracted_curp TEXT;

-- =====================================================
-- STORAGE: Create bucket for ID documents
-- =====================================================

-- Create private bucket for ID documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'id-documents',
  'id-documents',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS Policies for id-documents bucket
-- =====================================================

-- Policy: Team owners can upload ID documents for their team's players
CREATE POLICY "Team owners can upload id documents" ON storage.objects AS permissive
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM teams t
    WHERE t.owner_id = auth.uid()
  )
);

-- Policy: Team owners can view their team's ID documents
CREATE POLICY "Team owners can view id documents" ON storage.objects AS permissive
FOR SELECT TO authenticated
USING (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM teams t
    WHERE t.owner_id = auth.uid()
  )
);

-- Policy: League admins can view ID documents for their league's teams
CREATE POLICY "League admins can view id documents" ON storage.objects AS permissive
FOR SELECT TO authenticated
USING (
  bucket_id = 'id-documents' AND
  (storage.foldername(name))[1] IN (
    SELECT t.id::text FROM teams t
    JOIN users u ON u.id = auth.uid()
    WHERE u.league_id = t.league_id
    AND u.role = 'league_admin'
  )
);

-- =====================================================
-- Indexes for better query performance
-- =====================================================

-- Index for finding unverified players
CREATE INDEX IF NOT EXISTS idx_players_id_verified ON players(id_verified) WHERE id_verified = false;

-- Index for age validation queries
CREATE INDEX IF NOT EXISTS idx_tournaments_age_validation ON tournaments(age_validation_enabled) WHERE age_validation_enabled = true;

-- =====================================================
-- Comments for documentation
-- =====================================================

COMMENT ON COLUMN tournaments.age_validation_enabled IS 'Whether age-based registration rules are enabled for this tournament';
COMMENT ON COLUMN tournaments.min_age IS 'Minimum age required for players (calculated at age_reference_date)';
COMMENT ON COLUMN tournaments.max_age IS 'Maximum age allowed for players (calculated at age_reference_date)';
COMMENT ON COLUMN tournaments.age_reference_date IS 'Date used to calculate player ages for validation';
COMMENT ON COLUMN tournaments.age_exception_count IS 'Number of players allowed to be registered outside the age range';
COMMENT ON COLUMN tournaments.age_exception_min_age IS 'Minimum age for exception players';
COMMENT ON COLUMN tournaments.age_exception_max_age IS 'Maximum age for exception players';
COMMENT ON COLUMN tournaments.id_document_required IS 'Whether uploading an ID document is mandatory for player registration';

COMMENT ON COLUMN players.id_document_url IS 'URL to the uploaded ID document in Supabase Storage';
COMMENT ON COLUMN players.id_verified IS 'Whether the player identity has been verified';
COMMENT ON COLUMN players.id_verified_at IS 'Timestamp of when the verification was completed';
COMMENT ON COLUMN players.id_verified_by IS 'User ID of who performed manual verification (if applicable)';
COMMENT ON COLUMN players.id_verification_method IS 'How verification was done: automatic (AI) or manual (admin)';
COMMENT ON COLUMN players.extracted_name IS 'Full name extracted from the ID document';
COMMENT ON COLUMN players.extracted_curp IS 'CURP extracted from the ID document';
