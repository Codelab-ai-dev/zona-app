-- ============================================================
-- RPC functions for aggregated player stats
-- Replaces client-side aggregation with server-side GROUP BY
-- ============================================================

-- Top Scorers by League
-- Returns aggregated goals/assists per player, sorted by goals desc
CREATE OR REPLACE FUNCTION get_top_scorers_by_league(
  p_league_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  jersey_number INT,
  "position" TEXT,
  photo TEXT,
  team_id UUID,
  team_name TEXT,
  matches_played BIGINT,
  goals BIGINT,
  assists BIGINT,
  yellow_cards BIGINT,
  red_cards BIGINT,
  minutes_played BIGINT
) AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  WHERE t.league_id = p_league_id
    AND t.is_active = true
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  HAVING COALESCE(SUM(ps.goals), 0) > 0
  ORDER BY goals DESC, assists DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- Discipline by League
-- Returns aggregated cards per player, sorted by discipline score desc
CREATE OR REPLACE FUNCTION get_discipline_by_league(
  p_league_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  jersey_number INT,
  "position" TEXT,
  photo TEXT,
  team_id UUID,
  team_name TEXT,
  matches_played BIGINT,
  goals BIGINT,
  assists BIGINT,
  yellow_cards BIGINT,
  red_cards BIGINT,
  minutes_played BIGINT
) AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  WHERE t.league_id = p_league_id
    AND t.is_active = true
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  HAVING (COALESCE(SUM(ps.yellow_cards), 0) + COALESCE(SUM(ps.red_cards), 0)) > 0
  ORDER BY (COALESCE(SUM(ps.yellow_cards), 0) + COALESCE(SUM(ps.red_cards), 0) * 3) DESC,
           COALESCE(SUM(ps.yellow_cards), 0) DESC
  LIMIT p_limit;
$$ LANGUAGE sql STABLE;

-- Stats by Team
-- Returns aggregated stats per player for a specific team
CREATE OR REPLACE FUNCTION get_stats_by_team(
  p_team_id UUID,
  p_tournament_id UUID DEFAULT NULL
)
RETURNS TABLE(
  player_id UUID,
  player_name TEXT,
  jersey_number INT,
  "position" TEXT,
  photo TEXT,
  team_id UUID,
  team_name TEXT,
  matches_played BIGINT,
  goals BIGINT,
  assists BIGINT,
  yellow_cards BIGINT,
  red_cards BIGINT,
  minutes_played BIGINT
) AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  LEFT JOIN matches m ON ps.match_id = m.id
  WHERE p.team_id = p_team_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  ORDER BY goals DESC, assists DESC;
$$ LANGUAGE sql STABLE;
