-- Create match referee report (cédula arbitral) tables
-- Migration: 20250912000001_create_match_referee_report.sql

-- Create custom types for referee report
CREATE TYPE card_type AS ENUM ('yellow', 'red');
CREATE TYPE goal_type AS ENUM ('normal', 'penalty', 'own_goal', 'free_kick');

-- Main referee report table
CREATE TABLE match_referee_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  referee_name VARCHAR(255),
  assistant_referee_1 VARCHAR(255),
  assistant_referee_2 VARCHAR(255),
  fourth_official VARCHAR(255),
  general_observations TEXT,
  weather_conditions VARCHAR(255),
  field_conditions VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one report per match
  CONSTRAINT unique_match_report UNIQUE(match_id)
);

-- Goals table for detailed goal information
CREATE TABLE match_goals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  minute INTEGER NOT NULL,
  goal_type goal_type DEFAULT 'normal',
  assist_player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints for valid minute
  CONSTRAINT match_goals_minute_check CHECK (minute >= 1 AND minute <= 120)
);

-- Cards table for yellow and red cards
CREATE TABLE match_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  card_type card_type NOT NULL,
  minute INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints for valid minute
  CONSTRAINT match_cards_minute_check CHECK (minute >= 1 AND minute <= 120)
);

-- Match incidents for additional referee observations
CREATE TABLE match_incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  minute INTEGER,
  incident_type VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints for valid minute (can be NULL for general incidents)
  CONSTRAINT match_incidents_minute_check CHECK (minute IS NULL OR (minute >= 1 AND minute <= 120))
);

-- Create indexes for better performance
CREATE INDEX idx_match_referee_reports_match_id ON match_referee_reports(match_id);
CREATE INDEX idx_match_goals_match_id ON match_goals(match_id);
CREATE INDEX idx_match_goals_player_id ON match_goals(player_id);
CREATE INDEX idx_match_goals_team_id ON match_goals(team_id);
CREATE INDEX idx_match_cards_match_id ON match_cards(match_id);
CREATE INDEX idx_match_cards_player_id ON match_cards(player_id);
CREATE INDEX idx_match_cards_team_id ON match_cards(team_id);
CREATE INDEX idx_match_incidents_match_id ON match_incidents(match_id);
CREATE INDEX idx_match_incidents_player_id ON match_incidents(player_id);

-- Enable RLS on all tables
ALTER TABLE match_referee_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_incidents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Match referee reports policies
CREATE POLICY "Users can view match referee reports for accessible tournaments" ON match_referee_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams team
          WHERE (team.id = m.home_team_id OR team.id = m.away_team_id)
          AND team.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can insert/update match referee reports" ON match_referee_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND l.admin_id = auth.uid()
    )
  );

-- Match goals policies
CREATE POLICY "Users can view match goals for accessible tournaments" ON match_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams team
          WHERE (team.id = m.home_team_id OR team.id = m.away_team_id)
          AND team.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can manage match goals" ON match_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND l.admin_id = auth.uid()
    )
  );

-- Match cards policies
CREATE POLICY "Users can view match cards for accessible tournaments" ON match_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams team
          WHERE (team.id = m.home_team_id OR team.id = m.away_team_id)
          AND team.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can manage match cards" ON match_cards
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND l.admin_id = auth.uid()
    )
  );

-- Match incidents policies
CREATE POLICY "Users can view match incidents for accessible tournaments" ON match_incidents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND (
        l.admin_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM teams team
          WHERE (team.id = m.home_team_id OR team.id = m.away_team_id)
          AND team.owner_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "League admins can manage match incidents" ON match_incidents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN tournaments t ON m.tournament_id = t.id
      JOIN leagues l ON t.league_id = l.id
      WHERE m.id = match_id
      AND l.admin_id = auth.uid()
    )
  );