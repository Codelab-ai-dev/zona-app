-- Create player suspensions table
-- Migration: 20251001000001_create_player_suspensions.sql

-- Create suspension types
CREATE TYPE suspension_type AS ENUM ('red_card', 'yellow_accumulation', 'disciplinary_committee', 'other');
CREATE TYPE suspension_status AS ENUM ('active', 'completed', 'cancelled');

-- Main suspensions table
CREATE TABLE player_suspensions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,

  -- Suspension details
  suspension_type suspension_type NOT NULL,
  reason TEXT NOT NULL,
  matches_to_serve INTEGER NOT NULL DEFAULT 1,
  matches_served INTEGER NOT NULL DEFAULT 0,
  status suspension_status NOT NULL DEFAULT 'active',

  -- Related to which card/incident caused this
  match_card_id UUID REFERENCES match_cards(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,

  -- Admin who created/modified the suspension
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Additional info
  notes TEXT,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT matches_served_check CHECK (matches_served >= 0 AND matches_served <= matches_to_serve)
);

-- Suspension history for tracking when a player was suspended in a match
CREATE TABLE suspension_match_applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  suspension_id UUID NOT NULL REFERENCES player_suspensions(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique constraint: one suspension can only be applied once per match
  CONSTRAINT unique_suspension_per_match UNIQUE(suspension_id, match_id)
);

-- Create indexes
CREATE INDEX idx_player_suspensions_player_id ON player_suspensions(player_id);
CREATE INDEX idx_player_suspensions_team_id ON player_suspensions(team_id);
CREATE INDEX idx_player_suspensions_league_id ON player_suspensions(league_id);
CREATE INDEX idx_player_suspensions_status ON player_suspensions(status);
CREATE INDEX idx_suspension_match_applications_suspension_id ON suspension_match_applications(suspension_id);
CREATE INDEX idx_suspension_match_applications_match_id ON suspension_match_applications(match_id);

-- Enable RLS
ALTER TABLE player_suspensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspension_match_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for player_suspensions
CREATE POLICY "Users can view suspensions for accessible leagues" ON player_suspensions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams t
          WHERE t.id = team_id
          AND t.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can manage suspensions" ON player_suspensions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_id
      AND l.admin_id = auth.uid()
    )
  );

-- RLS Policies for suspension_match_applications
CREATE POLICY "Users can view suspension applications for accessible leagues" ON suspension_match_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM player_suspensions ps
      JOIN leagues l ON ps.league_id = l.id
      WHERE ps.id = suspension_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams t
          WHERE t.id = ps.team_id
          AND t.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can manage suspension applications" ON suspension_match_applications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM player_suspensions ps
      JOIN leagues l ON ps.league_id = l.id
      WHERE ps.id = suspension_id
      AND l.admin_id = auth.uid()
    )
  );

-- Function to automatically create suspension for red cards
CREATE OR REPLACE FUNCTION create_suspension_for_red_card()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create suspension for red cards
  IF NEW.card_type = 'red' THEN
    -- Get league_id from the match
    INSERT INTO player_suspensions (
      player_id,
      team_id,
      league_id,
      tournament_id,
      suspension_type,
      reason,
      matches_to_serve,
      match_card_id,
      match_id
    )
    SELECT
      NEW.player_id,
      NEW.team_id,
      t.league_id,
      m.tournament_id,
      'red_card',
      COALESCE(NEW.reason, 'Tarjeta roja directa'),
      1, -- Default: 1 match suspension
      NEW.id,
      NEW.match_id
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = NEW.match_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically create suspensions for red cards
CREATE TRIGGER trigger_create_suspension_for_red_card
  AFTER INSERT ON match_cards
  FOR EACH ROW
  EXECUTE FUNCTION create_suspension_for_red_card();

-- Function to check and create suspensions for yellow card accumulation
-- This should be called by the application when needed
CREATE OR REPLACE FUNCTION check_yellow_card_accumulation(
  p_player_id UUID,
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL,
  p_yellow_limit INTEGER DEFAULT 5
)
RETURNS BOOLEAN AS $$
DECLARE
  v_yellow_count INTEGER;
  v_existing_suspension UUID;
  v_team_id UUID;
BEGIN
  -- Count yellow cards for this player in the league/tournament
  SELECT COUNT(*)
  INTO v_yellow_count
  FROM match_cards mc
  JOIN matches m ON mc.match_id = m.id
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE mc.player_id = p_player_id
    AND mc.card_type = 'yellow'
    AND t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id);

  -- Check if player already has an active yellow accumulation suspension
  SELECT id INTO v_existing_suspension
  FROM player_suspensions
  WHERE player_id = p_player_id
    AND league_id = p_league_id
    AND suspension_type = 'yellow_accumulation'
    AND status = 'active'
  LIMIT 1;

  -- If accumulated enough cards and no existing suspension, create one
  IF v_yellow_count >= p_yellow_limit AND v_existing_suspension IS NULL THEN
    -- Get player's team
    SELECT team_id INTO v_team_id
    FROM players
    WHERE id = p_player_id;

    INSERT INTO player_suspensions (
      player_id,
      team_id,
      league_id,
      tournament_id,
      suspension_type,
      reason,
      matches_to_serve
    )
    VALUES (
      p_player_id,
      v_team_id,
      p_league_id,
      p_tournament_id,
      'yellow_accumulation',
      format('Acumulación de %s tarjetas amarillas', v_yellow_count),
      1
    );

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to check if a player is suspended for a specific match
CREATE OR REPLACE FUNCTION is_player_suspended(
  p_player_id UUID,
  p_match_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_active_suspensions INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_active_suspensions
  FROM player_suspensions ps
  JOIN matches m ON m.id = p_match_id
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE ps.player_id = p_player_id
    AND ps.league_id = t.league_id
    AND ps.status = 'active'
    AND ps.matches_served < ps.matches_to_serve;

  RETURN v_active_suspensions > 0;
END;
$$ LANGUAGE plpgsql;
