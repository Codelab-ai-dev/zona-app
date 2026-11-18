-- +goose Up
-- One definition of the standings order (#85). It was repeated in several
-- Go queries, an SQL function and the Flutter client, and none of them said
-- what happens after goals for: fully tied teams came back in whatever
-- order PostgreSQL returned them, so two screens could disagree.
--
-- Order: points + manual adjustment, goal difference, goals for, then team
-- name and id so the result is always the same.
CREATE VIEW public.tournament_standings AS
SELECT ts.*,
       tm.name AS team_name,
       ts.points + COALESCE(ts.points_adjustment, 0) AS total_points,
       row_number() OVER (
           PARTITION BY ts.tournament_id
           ORDER BY ts.points + COALESCE(ts.points_adjustment, 0) DESC,
                    ts.goal_difference DESC,
                    ts.goals_for DESC,
                    tm.name,
                    tm.id
       )::int AS position
FROM public.team_stats ts
JOIN public.teams tm ON tm.id = ts.team_id;

-- The assistant's knowledge base table used plain points (no manual
-- adjustment) for both the order and the PTS column, so it contradicted
-- the portal whenever a league adjusted points. It now reads the view.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.generate_standings_content(p_league_id uuid, p_tournament_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_content TEXT;
  v_team RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_rows INTEGER := 0;
BEGIN
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

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

  FOR v_team IN
    SELECT s.position, s.team_name, s.matches_played AS pj, s.matches_won AS pg, s.matches_drawn AS pe,
           s.matches_lost AS pp, s.goals_for AS gf, s.goals_against AS gc, s.goal_difference AS gd,
           s.total_points AS pts
    FROM tournament_standings s
    WHERE s.league_id = p_league_id
      AND (p_tournament_id IS NULL OR s.tournament_id = p_tournament_id)
    ORDER BY s.tournament_id, s.position
  LOOP
    v_rows := v_rows + 1;
    v_content := v_content || format(
      E'%-3s %-20s %3s %3s %3s %3s %4s %4s %4s %5s\n',
      v_team.position::TEXT,
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

  IF v_rows = 0 THEN
    v_content := v_content || E'No hay datos disponibles.\n';
  END IF;

  RETURN v_content;
END;
$$;
-- +goose StatementEnd

-- +goose Down
-- Back to 00007's function (the view goes with it).
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
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

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

  FOR v_team IN
    SELECT t.name as team_name, ts.matches_played as pj, ts.matches_won as pg, ts.matches_drawn as pe,
           ts.matches_lost as pp, ts.goals_for as gf, ts.goals_against as gc, ts.goal_difference as gd, ts.points as pts
    FROM team_stats ts
    JOIN teams t ON ts.team_id = t.id
    WHERE ts.league_id = p_league_id
    AND (p_tournament_id IS NULL OR ts.tournament_id = p_tournament_id)
    ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC
  LOOP
    v_position := v_position + 1;
    v_content := v_content || format(
      E'%-3s %-20s %3s %3s %3s %3s %4s %4s %4s %5s\n',
      v_position::TEXT, LEFT(v_team.team_name, 20), v_team.pj::TEXT, v_team.pg::TEXT, v_team.pe::TEXT,
      v_team.pp::TEXT, v_team.gf::TEXT, v_team.gc::TEXT,
      (CASE WHEN v_team.gd > 0 THEN '+' ELSE '' END || v_team.gd::TEXT), v_team.pts::TEXT
    );
  END LOOP;

  IF v_position = 0 THEN
    v_content := v_content || E'No hay datos disponibles.\n';
  END IF;

  RETURN v_content;
END;
$$;
-- +goose StatementEnd
DROP VIEW IF EXISTS public.tournament_standings;
