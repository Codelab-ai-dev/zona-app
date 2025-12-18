-- ============================================================================
-- IMPROVE MATCH RESULT CONTENT - FULL DETAILS
-- Migration: 20251216000001_improve_match_content_full_details.sql
--
-- Purpose: Include ALL match information in knowledge base content:
-- - Round/Jornada
-- - Red cards (expulsions)
-- - Yellow cards
-- - Assists (if available in player_stats)
-- - Field number
-- - Match time
-- - More complete context
-- ============================================================================

-- ============================================================================
-- UPDATE FUNCTION TO INCLUDE FULL MATCH DETAILS
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_match_result_content(p_match_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_observations TEXT;
  v_winner TEXT;
  v_result_type TEXT;
  v_player RECORD;
  v_home_goalscorers TEXT := '';
  v_away_goalscorers TEXT := '';
  v_home_red_cards TEXT := '';
  v_away_red_cards TEXT := '';
  v_home_yellow_cards TEXT := '';
  v_away_yellow_cards TEXT := '';
  v_has_home_goals BOOLEAN := false;
  v_has_away_goals BOOLEAN := false;
  v_has_home_red BOOLEAN := false;
  v_has_away_red BOOLEAN := false;
  v_has_home_yellow BOOLEAN := false;
  v_has_away_yellow BOOLEAN := false;
BEGIN
  -- Get match details with all related information
  SELECT
    m.id,
    m.match_date,
    m.match_time,
    m.field_number,
    m.home_score,
    m.away_score,
    m.home_team_id,
    m.away_team_id,
    m.round,
    ht.name as home_team_name,
    at.name as away_team_name,
    t.name as tournament_name,
    t.league_id,
    l.name as league_name,
    m.phase,
    m.playoff_round,
    m.status
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

  -- Build main content header
  v_content := format(
    E'⚽ RESULTADO DEL PARTIDO\n\n' ||
    E'🏆 Liga: %s\n' ||
    E'🏅 Torneo: %s\n',
    v_match.league_name,
    COALESCE(v_match.tournament_name, 'Torneo')
  );

  -- Add Round/Jornada if available
  IF v_match.round IS NOT NULL THEN
    v_content := v_content || format(E'📅 Jornada: %s\n', v_match.round);
  END IF;

  -- Add date and time
  v_content := v_content || format(
    E'📆 Fecha: %s',
    TO_CHAR(v_match.match_date, 'DD/MM/YYYY HH24:MI')
  );

  -- Add field number if available
  IF v_match.field_number IS NOT NULL THEN
    v_content := v_content || format(E' | Cancha: %s', v_match.field_number);
  END IF;

  v_content := v_content || E'\n\n';

  -- Add final score
  v_content := v_content || format(
    E'RESULTADO FINAL:\n' ||
    E'%s  %s - %s  %s\n\n' ||
    E'%s: %s\n',
    v_match.home_team_name,
    v_match.home_score,
    v_match.away_score,
    v_match.away_team_name,
    v_result_type,
    v_winner
  );

  -- ========================================================================
  -- GOALSCORERS
  -- ========================================================================

  -- Get goalscorers for home team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals,
      ps.assists
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_home_goals := true;
    IF v_player.goals = 1 THEN
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s)',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s) - %s goles',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.goals
      );
    END IF;

    -- Add assists if available
    IF v_player.assists IS NOT NULL AND v_player.assists > 0 THEN
      v_home_goalscorers := v_home_goalscorers || format(' + %s asistencia(s)', v_player.assists);
    END IF;

    v_home_goalscorers := v_home_goalscorers || E'\n';
  END LOOP;

  -- Get goalscorers for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals,
      ps.assists
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_away_goals := true;
    IF v_player.goals = 1 THEN
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s)',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s) - %s goles',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.goals
      );
    END IF;

    -- Add assists if available
    IF v_player.assists IS NOT NULL AND v_player.assists > 0 THEN
      v_away_goalscorers := v_away_goalscorers || format(' + %s asistencia(s)', v_player.assists);
    END IF;

    v_away_goalscorers := v_away_goalscorers || E'\n';
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

  -- ========================================================================
  -- RED CARDS (EXPULSIONS)
  -- ========================================================================

  -- Get red cards for home team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.red_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.red_cards > 0
    ORDER BY p.name
  LOOP
    v_has_home_red := true;
    v_home_red_cards := v_home_red_cards || format(
      E'  • %s (#%s)\n',
      v_player.player_name,
      COALESCE(v_player.jersey_number::TEXT, 'S/N')
    );
  END LOOP;

  -- Get red cards for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.red_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.red_cards > 0
    ORDER BY p.name
  LOOP
    v_has_away_red := true;
    v_away_red_cards := v_away_red_cards || format(
      E'  • %s (#%s)\n',
      v_player.player_name,
      COALESCE(v_player.jersey_number::TEXT, 'S/N')
    );
  END LOOP;

  -- Add red cards section if there are any
  IF v_has_home_red OR v_has_away_red THEN
    v_content := v_content || E'\n🟥 TARJETAS ROJAS (EXPULSADOS):\n';

    IF v_has_home_red THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_red_cards);
    END IF;

    IF v_has_away_red THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_red_cards);
    END IF;
  END IF;

  -- ========================================================================
  -- YELLOW CARDS
  -- ========================================================================

  -- Get yellow cards for home team (only if > 1 to avoid clutter)
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.yellow_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.yellow_cards > 0
    ORDER BY ps.yellow_cards DESC, p.name
  LOOP
    v_has_home_yellow := true;
    IF v_player.yellow_cards = 1 THEN
      v_home_yellow_cards := v_home_yellow_cards || format(
        E'  • %s (#%s)\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_home_yellow_cards := v_home_yellow_cards || format(
        E'  • %s (#%s) - %s tarjetas\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.yellow_cards
      );
    END IF;
  END LOOP;

  -- Get yellow cards for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.yellow_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.yellow_cards > 0
    ORDER BY ps.yellow_cards DESC, p.name
  LOOP
    v_has_away_yellow := true;
    IF v_player.yellow_cards = 1 THEN
      v_away_yellow_cards := v_away_yellow_cards || format(
        E'  • %s (#%s)\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_away_yellow_cards := v_away_yellow_cards || format(
        E'  • %s (#%s) - %s tarjetas\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.yellow_cards
      );
    END IF;
  END LOOP;

  -- Add yellow cards section if there are any
  IF v_has_home_yellow OR v_has_away_yellow THEN
    v_content := v_content || E'\n🟨 TARJETAS AMARILLAS:\n';

    IF v_has_home_yellow THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_yellow_cards);
    END IF;

    IF v_has_away_yellow THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_yellow_cards);
    END IF;
  END IF;

  -- ========================================================================
  -- ADDITIONAL INFO
  -- ========================================================================

  -- Add phase info if playoff match
  IF v_match.phase IS NOT NULL THEN
    v_content := v_content || format(
      E'\n\n📊 Fase: %s',
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
-- ADD COMMENT
-- ============================================================================

COMMENT ON FUNCTION generate_match_result_content IS
'Generate comprehensive content for a finished match including:
- Score and teams
- Round/Jornada
- Field number and time
- Goalscorers with assists
- Red cards (expulsions)
- Yellow cards
- Phase information
- Referee observations';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Para aplicar esta migración a partidos existentes, ejecuta:
-- SELECT auto_update_knowledge_base_on_match_finish()
-- para cada partido que ya esté finalizado
