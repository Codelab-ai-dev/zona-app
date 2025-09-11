-- Verification queries and helper functions for team statistics
-- Migration: 20250108000004_verification_queries.sql

-- Function to verify team statistics are correct
CREATE OR REPLACE FUNCTION verify_team_stats()
RETURNS TABLE (
    team_name TEXT,
    tournament_name TEXT,
    stats_matches_played INTEGER,
    actual_matches_played BIGINT,
    stats_points INTEGER,
    stats_goals_for INTEGER,
    stats_goals_against INTEGER,
    stats_goal_difference INTEGER,
    verification_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name as team_name,
        tr.name as tournament_name,
        ts.matches_played as stats_matches_played,
        COUNT(m.id) as actual_matches_played,
        ts.points as stats_points,
        ts.goals_for as stats_goals_for,
        ts.goals_against as stats_goals_against,
        ts.goal_difference as stats_goal_difference,
        CASE 
            WHEN ts.matches_played = COUNT(m.id) THEN '✅ CORRECT'
            ELSE '❌ MISMATCH'
        END as verification_status
    FROM team_stats ts
    JOIN teams t ON ts.team_id = t.id
    JOIN tournaments tr ON ts.tournament_id = tr.id
    LEFT JOIN matches m ON (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id) 
                        AND m.tournament_id = ts.tournament_id 
                        AND m.status = 'finished'
    GROUP BY ts.id, t.name, tr.name, ts.matches_played, ts.points, 
             ts.goals_for, ts.goals_against, ts.goal_difference
    ORDER BY t.name, tr.name;
END;
$$ LANGUAGE plpgsql;

-- Function to show current tournament standings with detailed info
CREATE OR REPLACE FUNCTION show_tournament_standings_detailed(tournament_id_param UUID DEFAULT NULL)
RETURNS TABLE (
    pos INTEGER,
    team_name TEXT,
    played INTEGER,
    won INTEGER,
    drawn INTEGER,
    lost INTEGER,
    gf INTEGER,
    ga INTEGER,
    gd INTEGER,
    points INTEGER,
    form TEXT,
    last_match TEXT
) AS $$
BEGIN
    IF tournament_id_param IS NULL THEN
        -- Show all tournaments if none specified
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (PARTITION BY tr.name ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as pos,
            (t.name || ' (' || tr.name || ')') as team_name,
            ts.matches_played as played,
            ts.matches_won as won,
            ts.matches_drawn as drawn,
            ts.matches_lost as lost,
            ts.goals_for as gf,
            ts.goals_against as ga,
            ts.goal_difference as gd,
            ts.points,
            COALESCE(ts.recent_form, '-') as form,
            COALESCE(ts.last_match_date::TEXT, 'No matches') as last_match
        FROM team_stats ts
        JOIN teams t ON ts.team_id = t.id
        JOIN tournaments tr ON ts.tournament_id = tr.id
        ORDER BY tr.name, ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
    ELSE
        -- Show specific tournament
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as pos,
            t.name as team_name,
            ts.matches_played as played,
            ts.matches_won as won,
            ts.matches_drawn as drawn,
            ts.matches_lost as lost,
            ts.goals_for as gf,
            ts.goals_against as ga,
            ts.goal_difference as gd,
            ts.points,
            COALESCE(ts.recent_form, '-') as form,
            COALESCE(ts.last_match_date::TEXT, 'No matches') as last_match
        FROM team_stats ts
        JOIN teams t ON ts.team_id = t.id
        WHERE ts.tournament_id = tournament_id_param
        ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a view for easy access to team statistics with team names
CREATE OR REPLACE VIEW team_stats_view AS
SELECT 
    ts.*,
    t.name as team_name,
    t.slug as team_slug,
    t.logo as team_logo,
    tr.name as tournament_name,
    l.name as league_name,
    ROW_NUMBER() OVER (PARTITION BY ts.tournament_id ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC) as tournament_position,
    ROUND((ts.matches_won::DECIMAL / NULLIF(ts.matches_played, 0) * 100), 1) as win_percentage,
    ROUND((ts.goals_for::DECIMAL / NULLIF(ts.matches_played, 0)), 2) as goals_per_match,
    ROUND((ts.goals_against::DECIMAL / NULLIF(ts.matches_played, 0)), 2) as goals_conceded_per_match
FROM team_stats ts
JOIN teams t ON ts.team_id = t.id
JOIN tournaments tr ON ts.tournament_id = tr.id
JOIN leagues l ON ts.league_id = l.id;

-- Insert some sample verification data (commented out - uncomment if needed for testing)
/*
-- Example: Insert a test comment to log what was processed
INSERT INTO team_stats (
    team_id, tournament_id, league_id, 
    matches_played, matches_won, matches_drawn, matches_lost,
    goals_for, goals_against, created_at, updated_at
) 
SELECT DISTINCT
    'test' as team_id, 
    'test' as tournament_id, 
    'test' as league_id,
    0, 0, 0, 0, 0, 0, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM matches WHERE status = 'finished')
ON CONFLICT DO NOTHING;
*/