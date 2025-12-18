-- ============================================================================
-- ADD MATCH_ID TO LEAGUE_KNOWLEDGE_BASE
-- Migration: 20251215000001_add_match_id_to_knowledge_base.sql
--
-- Purpose: Add match_id column to league_knowledge_base table
-- This allows linking knowledge entries to specific matches when they are finalized
-- ============================================================================

-- ============================================================================
-- 1. ADD MATCH_ID COLUMN
-- ============================================================================

-- Add match_id column as optional reference to matches table
ALTER TABLE league_knowledge_base
ADD COLUMN match_id UUID REFERENCES matches(id) ON DELETE CASCADE;

-- Create index for performance when querying by match_id
CREATE INDEX idx_knowledge_base_match_id ON league_knowledge_base(match_id);

-- ============================================================================
-- 2. UPDATE CONTENT_TYPE TO INCLUDE MATCH-SPECIFIC TYPES
-- ============================================================================

-- Update the CHECK constraint to include new content type for individual match results
ALTER TABLE league_knowledge_base
DROP CONSTRAINT IF EXISTS league_knowledge_base_content_type_check;

ALTER TABLE league_knowledge_base
ADD CONSTRAINT league_knowledge_base_content_type_check CHECK (content_type IN (
  'jornada',           -- Weekly matches schedule
  'tabla_posiciones',  -- League standings/table
  'suspensiones',      -- Active suspensions
  'resultados',        -- Match results (multiple matches)
  'resultado_partido', -- Individual match result (NEW - for specific match)
  'estadisticas',      -- Player/team statistics
  'proximo_partido'    -- Next match info
));

-- ============================================================================
-- 3. CREATE FUNCTION TO GENERATE INDIVIDUAL MATCH RESULT CONTENT
-- ============================================================================

-- Function to generate detailed content for a single finished match
CREATE OR REPLACE FUNCTION generate_match_result_content(p_match_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_winner TEXT;
  v_result_type TEXT;
  v_observations TEXT;
BEGIN
  -- Get match details with all related information
  SELECT
    m.id,
    m.match_date,
    m.home_score,
    m.away_score,
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

  -- Build content text
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

  -- Add statistics summary (goals, cards, etc.) could be added here
  -- For now, we'll keep it simple with just the result

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE TRIGGER TO AUTO-POPULATE KNOWLEDGE BASE ON MATCH FINISH
-- ============================================================================

-- Function that will be called by the trigger
CREATE OR REPLACE FUNCTION auto_update_knowledge_base_on_match_finish()
RETURNS TRIGGER AS $$
DECLARE
  v_match_content TEXT;
  v_league_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Only process if match status changed to 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN

    -- Get league_id and tournament_id from the match
    SELECT t.league_id, t.id
    INTO v_league_id, v_tournament_id
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    -- Generate match result content
    v_match_content := generate_match_result_content(NEW.id);

    -- Only insert if content was generated successfully
    IF v_match_content IS NOT NULL AND LENGTH(v_match_content) > 0 THEN
      -- Insert into knowledge base
      INSERT INTO league_knowledge_base (
        league_id,
        tournament_id,
        match_id,
        content_type,
        content_text,
        metadata,
        is_auto_generated,
        valid_from
      ) VALUES (
        v_league_id,
        v_tournament_id,
        NEW.id,
        'resultado_partido',
        v_match_content,
        jsonb_build_object(
          'match_id', NEW.id,
          'home_team_id', NEW.home_team_id,
          'away_team_id', NEW.away_team_id,
          'home_score', NEW.home_score,
          'away_score', NEW.away_score,
          'match_date', NEW.match_date,
          'finalized_at', NEW.updated_at
        ),
        true,
        NEW.match_date
      );

      RAISE NOTICE 'Knowledge base entry created for match %', NEW.id;
    END IF;

    -- Also refresh the league's general knowledge (standings, results, etc.)
    -- This ensures the AI has up-to-date information about the league
    PERFORM refresh_league_knowledge(v_league_id, v_tournament_id);

    RAISE NOTICE 'League knowledge refreshed for league % and tournament %', v_league_id, v_tournament_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger on matches table
DROP TRIGGER IF EXISTS trigger_update_knowledge_on_match_finish ON matches;

CREATE TRIGGER trigger_update_knowledge_on_match_finish
  AFTER UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_knowledge_base_on_match_finish();

-- ============================================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN league_knowledge_base.match_id IS 'Optional reference to specific match (used for individual match results)';
COMMENT ON FUNCTION generate_match_result_content IS 'Generate detailed content for a finished match including score, teams, and observations';
COMMENT ON FUNCTION auto_update_knowledge_base_on_match_finish IS 'Automatically update knowledge base when a match is finished';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
