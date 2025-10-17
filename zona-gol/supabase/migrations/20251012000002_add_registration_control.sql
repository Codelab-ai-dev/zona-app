-- Add registration_open column to tournaments table
-- This allows league admins to control when player registrations are open/closed

ALTER TABLE tournaments
ADD COLUMN registration_open BOOLEAN DEFAULT true;

COMMENT ON COLUMN tournaments.registration_open IS 'Controls whether player registrations are open for this tournament. League admins can close registrations at any jornada.';

-- Create table for exceptional player requests
CREATE TABLE IF NOT EXISTS player_registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  player_name VARCHAR(255) NOT NULL,
  player_position VARCHAR(100) NOT NULL,
  jersey_number INTEGER NOT NULL,
  birth_date DATE,
  reason TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX idx_player_registration_requests_team ON player_registration_requests(team_id);
CREATE INDEX idx_player_registration_requests_tournament ON player_registration_requests(tournament_id);
CREATE INDEX idx_player_registration_requests_status ON player_registration_requests(status);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_player_registration_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_player_registration_requests_updated_at
  BEFORE UPDATE ON player_registration_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_player_registration_requests_updated_at();

COMMENT ON TABLE player_registration_requests IS 'Stores requests for exceptional player registrations when registration period is closed (e.g., due to injuries)';
