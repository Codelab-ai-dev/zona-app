-- ============================================================================
-- ADD JORNADA CALENDAR TO KNOWLEDGE BASE
-- Migration: 20251215000004_add_jornada_calendar_function.sql
--
-- Purpose: Generate calendar entries for each jornada (round) including
-- field number, match time, and date
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO GENERATE JORNADA CALENDAR
-- ============================================================================

-- Function to generate calendar for a specific jornada
CREATE OR REPLACE FUNCTION generate_jornada_calendar(
  p_league_id UUID,
  p_tournament_id UUID,
  p_round INTEGER
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_match_count INTEGER := 0;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'📅 JORNADA %s\n\n' ||
    E'🏆 Liga: %s\n' ||
    E'🏅 Torneo: %s\n\n' ||
    E'CALENDARIO DE PARTIDOS:\n' ||
    E'%s\n',
    p_round,
    v_league_name,
    COALESCE(v_tournament_name, 'Todos los torneos'),
    REPEAT('-', 60)
  );

  -- Get matches for this round
  FOR v_match IN
    SELECT
      m.id,
      m.match_date,
      m.match_time,
      m.field_number,
      TO_CHAR(m.match_date, 'DD/MM/YYYY') as fecha,
      TO_CHAR(m.match_date, 'Day') as dia_semana,
      COALESCE(TO_CHAR(m.match_time, 'HH24:MI'),
               TO_CHAR(m.match_date, 'HH24:MI')) as hora,
      ht.name as equipo_local,
      at.name as equipo_visitante,
      m.home_score,
      m.away_score,
      m.status
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.round = p_round
    ORDER BY m.match_date, m.match_time NULLS LAST, m.field_number NULLS LAST
  LOOP
    v_match_count := v_match_count + 1;

    -- Add match info
    v_content := v_content || format(
      E'\n📍 %s, %s - %s',
      TRIM(v_match.dia_semana),
      v_match.fecha,
      v_match.hora
    );

    -- Add field number if available
    IF v_match.field_number IS NOT NULL THEN
      v_content := v_content || format(' | Cancha %s', v_match.field_number);
    END IF;

    v_content := v_content || E'\n';

    -- Add teams
    v_content := v_content || format(
      E'   %s  vs  %s',
      v_match.equipo_local,
      v_match.equipo_visitante
    );

    -- Add score if match is finished or in progress
    IF v_match.status = 'finished' THEN
      v_content := v_content || format(
        E'\n   ✅ Finalizado: %s - %s',
        v_match.home_score,
        v_match.away_score
      );
    ELSIF v_match.status = 'in_progress' THEN
      v_content := v_content || format(
        E'\n   ⚽ EN VIVO: %s - %s',
        v_match.home_score,
        v_match.away_score
      );
    ELSIF v_match.status = 'cancelled' THEN
      v_content := v_content || E'\n   ❌ Cancelado';
    END IF;

    v_content := v_content || E'\n';
  END LOOP;

  -- If no matches found
  IF v_match_count = 0 THEN
    v_content := v_content || E'\nNo hay partidos programados para esta jornada.\n';
  ELSE
    v_content := v_content || format(E'\n%s\nTotal de partidos: %s\n', REPEAT('-', 60), v_match_count);
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. FUNCTION TO INSERT JORNADA INTO KNOWLEDGE BASE
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_jornada_to_knowledge_base(
  p_league_id UUID,
  p_tournament_id UUID,
  p_round INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_content TEXT;
  v_earliest_match_date TIMESTAMP WITH TIME ZONE;
  v_latest_match_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate calendar content
  v_content := generate_jornada_calendar(p_league_id, p_tournament_id, p_round);

  -- Get date range for this jornada
  SELECT
    MIN(m.match_date),
    MAX(m.match_date)
  INTO v_earliest_match_date, v_latest_match_date
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE t.league_id = p_league_id
  AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  AND m.round = p_round;

  -- Delete existing entry for this jornada if exists
  DELETE FROM league_knowledge_base
  WHERE league_id = p_league_id
  AND (p_tournament_id IS NULL OR tournament_id = p_tournament_id)
  AND content_type = 'jornada'
  AND metadata->>'round' = p_round::TEXT;

  -- Insert new entry
  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated,
    valid_from,
    valid_until,
    created_at,
    updated_at
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'jornada',
    v_content,
    jsonb_build_object(
      'round', p_round,
      'earliest_match', v_earliest_match_date,
      'latest_match', v_latest_match_date,
      'type', 'jornada_calendar'
    ),
    true,
    v_earliest_match_date,
    v_latest_match_date + INTERVAL '7 days', -- Valid for 7 days after last match
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Jornada % insertada en knowledge base', p_round;
  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error insertando jornada %: %', p_round, SQLERRM;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FUNCTION TO POPULATE ALL JORNADAS FOR A TOURNAMENT
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_all_jornadas_to_knowledge_base(
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL
)
RETURNS TABLE (
  round INTEGER,
  inserted BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_round INTEGER;
BEGIN
  -- Loop through all rounds that exist for this league/tournament
  FOR v_round IN
    SELECT DISTINCT m.round
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.round IS NOT NULL
    ORDER BY m.round
  LOOP
    BEGIN
      round := v_round;
      inserted := insert_jornada_to_knowledge_base(p_league_id, p_tournament_id, v_round);
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      round := v_round;
      inserted := FALSE;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. TRIGGER TO UPDATE JORNADA WHEN MATCH CHANGES
-- ============================================================================

-- Function to update jornada calendar when a match is modified
CREATE OR REPLACE FUNCTION auto_update_jornada_on_match_change()
RETURNS TRIGGER AS $$
DECLARE
  v_league_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Get league and tournament IDs
  SELECT t.league_id, t.id
  INTO v_league_id, v_tournament_id
  FROM tournaments t
  WHERE t.id = COALESCE(NEW.tournament_id, OLD.tournament_id);

  -- Update jornada if round exists
  IF COALESCE(NEW.round, OLD.round) IS NOT NULL THEN
    PERFORM insert_jornada_to_knowledge_base(
      v_league_id,
      v_tournament_id,
      COALESCE(NEW.round, OLD.round)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for match updates
DROP TRIGGER IF EXISTS trigger_update_jornada_on_match_change ON matches;

CREATE TRIGGER trigger_update_jornada_on_match_change
  AFTER INSERT OR UPDATE OR DELETE ON matches
  FOR EACH ROW
  WHEN (COALESCE(NEW.round, OLD.round) IS NOT NULL)
  EXECUTE FUNCTION auto_update_jornada_on_match_change();

-- ============================================================================
-- 5. HELPER FUNCTION TO GET CURRENT/NEXT JORNADA
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_jornada(
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_current_round INTEGER;
BEGIN
  -- Get the round of the next scheduled or in-progress match
  SELECT m.round INTO v_current_round
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE t.league_id = p_league_id
  AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  AND m.status IN ('scheduled', 'in_progress')
  AND m.round IS NOT NULL
  ORDER BY m.match_date, m.round
  LIMIT 1;

  -- If no upcoming matches, return the last finished round
  IF v_current_round IS NULL THEN
    SELECT MAX(m.round) INTO v_current_round
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.status = 'finished'
    AND m.round IS NOT NULL;
  END IF;

  RETURN v_current_round;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION generate_jornada_calendar IS 'Generate formatted calendar text for a specific jornada including date, time, field, and teams';
COMMENT ON FUNCTION insert_jornada_to_knowledge_base IS 'Insert or update a jornada calendar entry in the knowledge base';
COMMENT ON FUNCTION populate_all_jornadas_to_knowledge_base IS 'Populate all existing jornadas for a league/tournament into knowledge base';
COMMENT ON FUNCTION get_current_jornada IS 'Get the current or next jornada number for a league/tournament';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
