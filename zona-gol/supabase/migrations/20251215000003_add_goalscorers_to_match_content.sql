-- ============================================================================
-- ADD GOALSCORERS TO MATCH RESULT CONTENT
-- Migration: 20251215000003_add_goalscorers_to_match_content.sql
--
-- Purpose: Update generate_match_result_content to include goalscorers info
-- ============================================================================

-- Update the function to include goalscorers
CREATE OR REPLACE FUNCTION generate_match_result_content(p_match_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_observations TEXT;
  v_winner TEXT;
  v_result_type TEXT;
  v_goalscorer RECORD;
  v_home_goalscorers TEXT := '';
  v_away_goalscorers TEXT := '';
  v_has_home_goals BOOLEAN := false;
  v_has_away_goals BOOLEAN := false;
BEGIN
  -- Get match details with all related information
  SELECT
    m.id,
    m.match_date,
    m.home_score,
    m.away_score,
    m.home_team_id,
    m.away_team_id,
    ht.name as home_team_name,
    at.name as away_team_name,
    t.name as tournament_name,
    t.league_id,
    l.name as league_name,
    m.phase,
    m.playoff_round
  INTO v_match
  FROM matches m
  JOIN teams ht ON m.home_team_id = ht.id
  JOIN teams at ON m.away_team_id = at.id
  JOIN tournaments t ON m.tournament_id = t.id
  JOIN leagues l ON t.league_id = l.id
  WHERE m.id = p_match_id
  AND m.status = 'finished';

  -- If match not found or not finished, return empty
  IF NOT FOUND THEN
    RETURN '';
  END IF;

  -- Get referee observations if available
  SELECT general_observations
  INTO v_observations
  FROM match_referee_reports
  WHERE match_id = p_match_id;

  -- Determine winner and result type
  IF v_match.home_score > v_match.away_score THEN
    v_winner := v_match.home_team_name;
    v_result_type := 'Victoria Local';
  ELSIF v_match.away_score > v_match.home_score THEN
    v_winner := v_match.away_team_name;
    v_result_type := 'Victoria Visitante';
  ELSE
    v_winner := 'Empate';
    v_result_type := 'Empate';
  END IF;

  -- Build main content
  v_content := format(
    E'⚽ RESULTADO DEL PARTIDO\n\n' ||
    E'🏆 %s\n' ||
    E'🏅 %s\n' ||
    E'📅 %s\n\n' ||
    E'RESULTADO FINAL:\n' ||
    E'%s  %s - %s  %s\n\n' ||
    E'%s: %s\n',
    v_match.league_name,
    COALESCE(v_match.tournament_name, 'Torneo'),
    TO_CHAR(v_match.match_date, 'DD/MM/YYYY HH24:MI'),
    v_match.home_team_name,
    v_match.home_score,
    v_match.away_score,
    v_match.away_team_name,
    v_result_type,
    v_winner
  );

  -- Get goalscorers for home team
  FOR v_goalscorer IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_home_goals := true;
    IF v_goalscorer.goals = 1 THEN
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s)\n',
        v_goalscorer.player_name,
        COALESCE(v_goalscorer.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s) - %s goles\n',
        v_goalscorer.player_name,
        COALESCE(v_goalscorer.jersey_number::TEXT, 'S/N'),
        v_goalscorer.goals
      );
    END IF;
  END LOOP;

  -- Get goalscorers for away team
  FOR v_goalscorer IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_away_goals := true;
    IF v_goalscorer.goals = 1 THEN
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s)\n',
        v_goalscorer.player_name,
        COALESCE(v_goalscorer.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s) - %s goles\n',
        v_goalscorer.player_name,
        COALESCE(v_goalscorer.jersey_number::TEXT, 'S/N'),
        v_goalscorer.goals
      );
    END IF;
  END LOOP;

  -- Add goalscorers section if there are any goals
  IF v_has_home_goals OR v_has_away_goals THEN
    v_content := v_content || E'\n⚽ GOLEADORES:\n';

    IF v_has_home_goals THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_goalscorers);
    END IF;

    IF v_has_away_goals THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_goalscorers);
    END IF;
  END IF;

  -- Add phase info if playoff match
  IF v_match.phase IS NOT NULL THEN
    v_content := v_content || format(
      E'\nFase: %s',
      CASE v_match.phase
        WHEN 'group' THEN 'Fase de Grupos'
        WHEN 'playoff' THEN format('Playoff - %s', COALESCE(v_match.playoff_round, 'Ronda'))
        ELSE v_match.phase
      END
    );
  END IF;

  -- Add referee observations if available
  IF v_observations IS NOT NULL AND LENGTH(TRIM(v_observations)) > 0 THEN
    v_content := v_content || format(
      E'\n\n📋 OBSERVACIONES DEL ÁRBITRO:\n%s',
      v_observations
    );
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON FUNCTION generate_match_result_content IS 'Generate detailed content for a finished match including score, teams, goalscorers, and observations';
