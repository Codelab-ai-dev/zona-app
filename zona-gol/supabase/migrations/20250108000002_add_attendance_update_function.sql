-- Add function to manually update team attendance stats for a match
-- Migration: 20250108000002_add_attendance_update_function.sql

-- Function to update team attendance statistics for a specific match
CREATE OR REPLACE FUNCTION update_team_attendance_for_match(match_id_param UUID)
RETURNS void AS $$
BEGIN
  -- Update team stats with attendance information for both teams in the match
  UPDATE team_stats ts
  SET 
    total_attendance = (
      SELECT COUNT(DISTINCT fa.player_id)
      FROM facial_attendance fa
      JOIN players p ON fa.player_id = p.id
      WHERE fa.match_id = match_id_param
      AND p.team_id = ts.team_id
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
    SELECT 1 FROM matches m
    WHERE m.id = match_id_param
    AND (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id)
    AND m.tournament_id = ts.tournament_id
  );
END;
$$ LANGUAGE plpgsql;

-- Function to rebuild all team stats for a tournament (useful for data migration or fixes)
CREATE OR REPLACE FUNCTION rebuild_team_stats_for_tournament(tournament_id_param UUID)
RETURNS void AS $$
DECLARE
    match_record RECORD;
BEGIN
  -- Delete existing stats for this tournament
  DELETE FROM team_stats WHERE tournament_id = tournament_id_param;
  
  -- Process each finished match to rebuild stats
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE tournament_id = tournament_id_param 
    AND status = 'finished'
    ORDER BY match_date ASC
  LOOP
    -- The trigger will handle creating/updating team stats
    UPDATE matches 
    SET updated_at = NOW()
    WHERE id = match_record.id;
  END LOOP;
  
  -- Update attendance stats for all matches in tournament
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE tournament_id = tournament_id_param 
    AND status = 'finished'
  LOOP
    PERFORM update_team_attendance_for_match(match_record.id);
  END LOOP;
  
END;
$$ LANGUAGE plpgsql;

-- Function to get current tournament standings (alternative to application logic)
CREATE OR REPLACE FUNCTION get_tournament_standings(tournament_id_param UUID)
RETURNS TABLE (
  team_position INTEGER,
  team_id UUID,
  team_name TEXT,
  team_logo TEXT,
  matches_played INTEGER,
  matches_won INTEGER,
  matches_drawn INTEGER,
  matches_lost INTEGER,
  goals_for INTEGER,
  goals_against INTEGER,
  goal_difference INTEGER,
  points INTEGER,
  recent_form TEXT,
  last_match_date TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as team_position,
    ts.team_id,
    t.name as team_name,
    t.logo as team_logo,
    ts.matches_played,
    ts.matches_won,
    ts.matches_drawn,
    ts.matches_lost,
    ts.goals_for,
    ts.goals_against,
    ts.goal_difference,
    ts.points,
    ts.recent_form,
    ts.last_match_date
  FROM team_stats ts
  JOIN teams t ON ts.team_id = t.id
  WHERE ts.tournament_id = tournament_id_param
  ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
END;
$$ LANGUAGE plpgsql;