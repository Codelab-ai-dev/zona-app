-- Create team statistics table
-- Migration: 20250108000001_create_team_stats_table.sql

-- Team statistics table for efficient team performance tracking
CREATE TABLE team_stats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  
  -- Match statistics
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  matches_drawn INTEGER DEFAULT 0,
  matches_lost INTEGER DEFAULT 0,
  
  -- Goal statistics
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_difference INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  
  -- Points calculation (3 for win, 1 for draw, 0 for loss)
  points INTEGER GENERATED ALWAYS AS (matches_won * 3 + matches_drawn) STORED,
  
  -- Additional performance metrics
  clean_sheets INTEGER DEFAULT 0, -- Matches without conceding goals
  biggest_win_margin INTEGER DEFAULT 0,
  biggest_loss_margin INTEGER DEFAULT 0,
  
  -- Discipline statistics
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  
  -- Attendance and participation
  total_attendance INTEGER DEFAULT 0, -- Sum of all player attendances
  average_attendance DECIMAL(5,2), -- Average players per match
  
  -- Form indicators (last 5 matches result as string like "WWLDW")
  recent_form TEXT DEFAULT '',
  
  -- Time-based tracking
  last_match_date TIMESTAMP WITH TIME ZONE,
  last_win_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique stats per team per tournament
  UNIQUE(team_id, tournament_id),
  
  -- Constraints for data integrity
  CONSTRAINT team_stats_matches_played_check CHECK (matches_played >= 0),
  CONSTRAINT team_stats_matches_won_check CHECK (matches_won >= 0 AND matches_won <= matches_played),
  CONSTRAINT team_stats_matches_drawn_check CHECK (matches_drawn >= 0 AND matches_drawn <= matches_played),
  CONSTRAINT team_stats_matches_lost_check CHECK (matches_lost >= 0 AND matches_lost <= matches_played),
  CONSTRAINT team_stats_match_total_check CHECK (matches_won + matches_drawn + matches_lost = matches_played),
  CONSTRAINT team_stats_goals_check CHECK (goals_for >= 0 AND goals_against >= 0),
  CONSTRAINT team_stats_clean_sheets_check CHECK (clean_sheets >= 0 AND clean_sheets <= matches_played),
  CONSTRAINT team_stats_cards_check CHECK (yellow_cards >= 0 AND red_cards >= 0),
  CONSTRAINT team_stats_attendance_check CHECK (total_attendance >= 0)
);

-- Create indexes for better performance
CREATE INDEX idx_team_stats_team_id ON team_stats(team_id);
CREATE INDEX idx_team_stats_tournament_id ON team_stats(tournament_id);
CREATE INDEX idx_team_stats_league_id ON team_stats(league_id);
CREATE INDEX idx_team_stats_points ON team_stats(points);
CREATE INDEX idx_team_stats_goal_difference ON team_stats(goal_difference);
CREATE INDEX idx_team_stats_matches_played ON team_stats(matches_played);
CREATE INDEX idx_team_stats_last_match_date ON team_stats(last_match_date);

-- Composite indexes for common queries (league standings)
CREATE INDEX idx_team_stats_tournament_points ON team_stats(tournament_id, points DESC, goal_difference DESC);
CREATE INDEX idx_team_stats_league_points ON team_stats(league_id, points DESC, goal_difference DESC);

-- Enable RLS
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public can view team stats" ON team_stats
  FOR SELECT USING (true);

CREATE POLICY "League admins can manage team stats in their league" ON team_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'league_admin'
      AND u.league_id = team_stats.league_id
    )
  );

CREATE POLICY "Super admins can manage all team stats" ON team_stats
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Function to update team statistics after a match
CREATE OR REPLACE FUNCTION update_team_stats_after_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process if match is finished
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    
    -- Update home team stats
    INSERT INTO team_stats (
      team_id, 
      tournament_id, 
      league_id,
      matches_played,
      matches_won,
      matches_drawn,
      matches_lost,
      goals_for,
      goals_against,
      clean_sheets,
      biggest_win_margin,
      biggest_loss_margin,
      last_match_date,
      last_win_date
    )
    SELECT 
      NEW.home_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      NEW.home_score,
      NEW.away_score,
      CASE WHEN NEW.away_score = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.home_team_id
    ON CONFLICT (team_id, tournament_id) 
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + NEW.home_score,
      goals_against = team_stats.goals_against + NEW.away_score,
      clean_sheets = team_stats.clean_sheets + CASE WHEN NEW.away_score = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin, 
        CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE 
        WHEN NEW.home_score > NEW.away_score THEN NEW.match_date 
        ELSE team_stats.last_win_date 
      END,
      updated_at = NOW();

    -- Update away team stats
    INSERT INTO team_stats (
      team_id, 
      tournament_id, 
      league_id,
      matches_played,
      matches_won,
      matches_drawn,
      matches_lost,
      goals_for,
      goals_against,
      clean_sheets,
      biggest_win_margin,
      biggest_loss_margin,
      last_match_date,
      last_win_date
    )
    SELECT 
      NEW.away_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      NEW.away_score,
      NEW.home_score,
      CASE WHEN NEW.home_score = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.away_team_id
    ON CONFLICT (team_id, tournament_id) 
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + NEW.away_score,
      goals_against = team_stats.goals_against + NEW.home_score,
      clean_sheets = team_stats.clean_sheets + CASE WHEN NEW.home_score = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin,
        CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE 
        WHEN NEW.away_score > NEW.home_score THEN NEW.match_date 
        ELSE team_stats.last_win_date 
      END,
      updated_at = NOW();
      
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update team stats when matches are finished
CREATE TRIGGER trigger_update_team_stats_after_match
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_team_stats_after_match();

-- Function to update player cards statistics in team stats
CREATE OR REPLACE FUNCTION update_team_cards_from_player_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team stats with card information when player stats are inserted/updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE team_stats ts
    SET 
      yellow_cards = (
        SELECT COALESCE(SUM(ps.yellow_cards), 0)
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN matches m ON ps.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      red_cards = (
        SELECT COALESCE(SUM(ps.red_cards), 0)
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN matches m ON ps.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      updated_at = NOW()
    WHERE EXISTS (
      SELECT 1 FROM players p
      JOIN matches m ON NEW.match_id = m.id
      WHERE p.id = NEW.player_id
      AND p.team_id = ts.team_id
      AND m.tournament_id = ts.tournament_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update team card stats when player stats change
CREATE TRIGGER trigger_update_team_cards_from_player_stats
  AFTER INSERT OR UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_team_cards_from_player_stats();

-- Function to calculate and update attendance stats
CREATE OR REPLACE FUNCTION update_team_attendance_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update team stats with attendance information
  IF TG_OP = 'INSERT' THEN
    UPDATE team_stats ts
    SET 
      total_attendance = (
        SELECT COUNT(DISTINCT fa.player_id)
        FROM facial_attendance fa
        JOIN players p ON fa.player_id = p.id
        JOIN matches m ON fa.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      average_attendance = (
        SELECT 
          CASE 
            WHEN COUNT(DISTINCT m.id) > 0 THEN 
              COUNT(DISTINCT fa.player_id)::DECIMAL / COUNT(DISTINCT m.id)
            ELSE 0 
          END
        FROM matches m
        LEFT JOIN facial_attendance fa ON m.id = fa.match_id
        LEFT JOIN players p ON fa.player_id = p.id
        WHERE (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id)
        AND m.tournament_id = ts.tournament_id
        AND m.status = 'finished'
        AND (p.team_id = ts.team_id OR p.team_id IS NULL)
      ),
      updated_at = NOW()
    WHERE EXISTS (
      SELECT 1 FROM players p
      JOIN matches m ON NEW.match_id = m.id
      WHERE p.id = NEW.player_id
      AND p.team_id = ts.team_id
      AND m.tournament_id = ts.tournament_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update attendance stats
CREATE TRIGGER trigger_update_team_attendance_stats
  AFTER INSERT ON facial_attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_team_attendance_stats();