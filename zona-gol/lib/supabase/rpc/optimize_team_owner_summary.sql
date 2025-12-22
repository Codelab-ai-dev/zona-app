-- =====================================================
-- PASO 1: CREAR ÍNDICES (ejecutar primero)
-- Estos índices acelerarán DRAMÁTICAMENTE las queries
-- =====================================================

-- Índice para buscar jugadores por equipo
CREATE INDEX IF NOT EXISTS idx_players_team_id_active
ON players(team_id)
WHERE is_active = true;

-- Índice para buscar estadísticas por jugador
CREATE INDEX IF NOT EXISTS idx_player_stats_player_id
ON player_stats(player_id);

-- Índices para buscar partidos por equipo (home y away)
CREATE INDEX IF NOT EXISTS idx_matches_home_team_id
ON matches(home_team_id);

CREATE INDEX IF NOT EXISTS idx_matches_away_team_id
ON matches(away_team_id);

-- Índice compuesto para partidos por equipo ordenados por fecha
CREATE INDEX IF NOT EXISTS idx_matches_teams_date
ON matches(home_team_id, away_team_id, match_date DESC);

-- Índice para suspensiones activas por equipo
CREATE INDEX IF NOT EXISTS idx_suspensions_team_active
ON player_suspensions(team_id)
WHERE status = 'active';

-- =====================================================
-- PASO 2: FUNCIÓN RPC OPTIMIZADA (ejecutar después)
-- =====================================================

CREATE OR REPLACE FUNCTION get_team_owner_summary(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_team JSON;
  v_players JSON;
  v_matches JSON;
  v_suspensions JSON;
BEGIN
  -- Query 1: Team (muy rápida con PK)
  SELECT json_build_object(
    'id', t.id,
    'name', t.name,
    'logo', t.logo,
    'slug', t.slug
  ) INTO v_team
  FROM teams t
  WHERE t.id = p_team_id;

  -- Query 2: Players con stats pre-agregadas
  -- Usamos una CTE para mayor claridad y potencial optimización
  WITH player_totals AS (
    SELECT
      ps.player_id,
      COALESCE(SUM(ps.goals), 0)::int as total_goals,
      COALESCE(SUM(ps.assists), 0)::int as total_assists,
      COALESCE(SUM(ps.yellow_cards), 0)::int as total_yellow_cards,
      COALESCE(SUM(ps.red_cards), 0)::int as total_red_cards,
      COALESCE(SUM(ps.minutes_played), 0)::int as total_minutes_played,
      COUNT(*)::int as matches_played
    FROM player_stats ps
    WHERE ps.player_id IN (
      SELECT id FROM players WHERE team_id = p_team_id AND is_active = true
    )
    GROUP BY ps.player_id
  )
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'jersey_number', p.jersey_number,
      'position', p.position,
      'photo', p.photo,
      'is_active', p.is_active,
      'total_goals', COALESCE(pt.total_goals, 0),
      'total_assists', COALESCE(pt.total_assists, 0),
      'total_yellow_cards', COALESCE(pt.total_yellow_cards, 0),
      'total_red_cards', COALESCE(pt.total_red_cards, 0),
      'total_minutes_played', COALESCE(pt.total_minutes_played, 0),
      'matches_played', COALESCE(pt.matches_played, 0)
    ) ORDER BY p.jersey_number
  ), '[]'::json) INTO v_players
  FROM players p
  LEFT JOIN player_totals pt ON p.id = pt.player_id
  WHERE p.team_id = p_team_id AND p.is_active = true;

  -- Query 3: Matches (limitados a 30, con índices será muy rápido)
  SELECT COALESCE(json_agg(match_data ORDER BY match_date DESC), '[]'::json) INTO v_matches
  FROM (
    SELECT
      m.id,
      m.match_date,
      m.status,
      m.round,
      m.home_score,
      m.away_score,
      m.home_team_id,
      m.away_team_id,
      json_build_object('id', ht.id, 'name', ht.name, 'logo', ht.logo) as home_team,
      json_build_object('id', at.id, 'name', at.name, 'logo', at.logo) as away_team
    FROM matches m
    LEFT JOIN teams ht ON m.home_team_id = ht.id
    LEFT JOIN teams at ON m.away_team_id = at.id
    WHERE m.home_team_id = p_team_id OR m.away_team_id = p_team_id
    ORDER BY m.match_date DESC
    LIMIT 30
  ) match_data;

  -- Query 4: Suspensions activas (con índice será instantánea)
  SELECT COALESCE(json_agg(
    json_build_object(
      'id', s.id,
      'player_id', s.player_id,
      'player_name', p.name,
      'jersey_number', p.jersey_number,
      'suspension_type', s.suspension_type,
      'reason', s.reason,
      'matches_to_serve', s.matches_to_serve,
      'matches_served', s.matches_served
    )
  ), '[]'::json) INTO v_suspensions
  FROM player_suspensions s
  INNER JOIN players p ON s.player_id = p.id
  WHERE s.team_id = p_team_id AND s.status = 'active';

  -- Combinar resultados
  result := json_build_object(
    'team', v_team,
    'players', v_players,
    'matches', v_matches,
    'suspensions', v_suspensions
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Permisos
GRANT EXECUTE ON FUNCTION get_team_owner_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_owner_summary(UUID) TO anon;

-- =====================================================
-- PASO 3: ANALIZAR TABLAS (ejecutar al final)
-- Esto actualiza las estadísticas del query planner
-- =====================================================
ANALYZE players;
ANALYZE player_stats;
ANALYZE matches;
ANALYZE player_suspensions;
ANALYZE teams;
