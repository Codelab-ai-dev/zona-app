-- Ejecutar este SQL en Supabase SQL Editor para crear la función RPC
-- Esta función obtiene TODO el resumen del team owner en UNA SOLA query optimizada

CREATE OR REPLACE FUNCTION get_team_owner_summary(p_team_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'team', (
      SELECT json_build_object(
        'id', t.id,
        'name', t.name,
        'logo', t.logo,
        'slug', t.slug
      )
      FROM teams t
      WHERE t.id = p_team_id
    ),
    'players', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', p.id,
          'name', p.name,
          'jersey_number', p.jersey_number,
          'position', p.position,
          'photo', p.photo,
          'is_active', p.is_active,
          'total_goals', COALESCE(stats.total_goals, 0),
          'total_assists', COALESCE(stats.total_assists, 0),
          'total_yellow_cards', COALESCE(stats.total_yellow_cards, 0),
          'total_red_cards', COALESCE(stats.total_red_cards, 0),
          'total_minutes_played', COALESCE(stats.total_minutes_played, 0),
          'matches_played', COALESCE(stats.matches_played, 0)
        )
      )
      FROM players p
      LEFT JOIN (
        SELECT
          ps.player_id,
          SUM(ps.goals)::int as total_goals,
          SUM(ps.assists)::int as total_assists,
          SUM(ps.yellow_cards)::int as total_yellow_cards,
          SUM(ps.red_cards)::int as total_red_cards,
          SUM(ps.minutes_played)::int as total_minutes_played,
          COUNT(*)::int as matches_played
        FROM player_stats ps
        INNER JOIN players pl ON ps.player_id = pl.id
        WHERE pl.team_id = p_team_id
        GROUP BY ps.player_id
      ) stats ON p.id = stats.player_id
      WHERE p.team_id = p_team_id AND p.is_active = true
    ), '[]'::json),
    'matches', COALESCE((
      SELECT json_agg(
        json_build_object(
          'id', m.id,
          'match_date', m.match_date,
          'status', m.status,
          'round', m.round,
          'home_score', m.home_score,
          'away_score', m.away_score,
          'home_team_id', m.home_team_id,
          'away_team_id', m.away_team_id,
          'home_team', json_build_object('id', ht.id, 'name', ht.name, 'logo', ht.logo),
          'away_team', json_build_object('id', at.id, 'name', at.name, 'logo', at.logo)
        )
        ORDER BY m.match_date DESC
      )
      FROM matches m
      LEFT JOIN teams ht ON m.home_team_id = ht.id
      LEFT JOIN teams at ON m.away_team_id = at.id
      WHERE m.home_team_id = p_team_id OR m.away_team_id = p_team_id
      LIMIT 30
    ), '[]'::json),
    'suspensions', COALESCE((
      SELECT json_agg(
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
      )
      FROM player_suspensions s
      INNER JOIN players p ON s.player_id = p.id
      WHERE s.team_id = p_team_id AND s.status = 'active'
    ), '[]'::json)
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Dar permisos para que los usuarios autenticados puedan ejecutarla
GRANT EXECUTE ON FUNCTION get_team_owner_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_owner_summary(UUID) TO anon;
