-- +goose Up
-- generate_standings_content used format('%+4s'), a flag PostgreSQL's
-- format() does not support. It runs inside the match-finished knowledge
-- trigger, so once a league had standings, finishing ANY further match
-- failed ("unrecognized format() type specifier \"+\"") and the result was
-- not saved. The goal difference is now signed explicitly.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.generate_standings_content(p_league_id uuid, p_tournament_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_content TEXT;
  v_team RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_position INTEGER := 0;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'🏆 TABLA DE POSICIONES\nLiga: %s\nTorneo: %s\n\n',
    v_league_name,
    COALESCE(v_tournament_name, 'General')
  );

  v_content := v_content || format(
    E'%-3s %-20s %3s %3s %3s %3s %4s %4s %4s %5s\n',
    'POS', 'EQUIPO', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'
  );
  v_content := v_content || REPEAT('-', 70) || E'\n';

  -- Get standings ordered by points, goal difference
  FOR v_team IN
    SELECT
      t.name as team_name,
      ts.matches_played as pj,
      ts.matches_won as pg,
      ts.matches_drawn as pe,
      ts.matches_lost as pp,
      ts.goals_for as gf,
      ts.goals_against as gc,
      ts.goal_difference as gd,
      ts.points as pts
    FROM team_stats ts
    JOIN teams t ON ts.team_id = t.id
    WHERE ts.league_id = p_league_id
    AND (p_tournament_id IS NULL OR ts.tournament_id = p_tournament_id)
    ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC
  LOOP
    v_position := v_position + 1;

    v_content := v_content || format(
      E'%-3s %-20s %3s %3s %3s %3s %4s %4s %4s %5s\n',
      v_position::TEXT,
      LEFT(v_team.team_name, 20),
      v_team.pj::TEXT,
      v_team.pg::TEXT,
      v_team.pe::TEXT,
      v_team.pp::TEXT,
      v_team.gf::TEXT,
      v_team.gc::TEXT,
      (CASE WHEN v_team.gd > 0 THEN '+' ELSE '' END || v_team.gd::TEXT),
      v_team.pts::TEXT
    );
  END LOOP;

  -- If no teams found
  IF v_position = 0 THEN
    v_content := v_content || E'No hay datos disponibles.\n';
  END IF;

  RETURN v_content;
END;
$$;

-- +goose StatementEnd

-- +goose Down
-- No down: restoring the broken function would only reintroduce the bug.
