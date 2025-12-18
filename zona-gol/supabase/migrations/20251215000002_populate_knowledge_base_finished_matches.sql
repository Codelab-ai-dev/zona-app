-- ============================================================================
-- POPULATE KNOWLEDGE BASE WITH EXISTING FINISHED MATCHES
-- Migration: 20251215000002_populate_knowledge_base_finished_matches.sql
--
-- Purpose: Process all existing finished matches and add them to knowledge base
-- This is a one-time migration to populate data for matches that were
-- finalized before the trigger was created
-- ============================================================================

-- ============================================================================
-- 1. CREATE FUNCTION TO PROCESS EXISTING FINISHED MATCHES
-- ============================================================================

CREATE OR REPLACE FUNCTION populate_knowledge_base_with_finished_matches()
RETURNS TABLE (
  match_id UUID,
  league_id UUID,
  tournament_id UUID,
  inserted BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_match RECORD;
  v_match_content TEXT;
  v_league_id UUID;
  v_tournament_id UUID;
  v_inserted BOOLEAN;
  v_error TEXT;
BEGIN
  -- Loop through all finished matches
  FOR v_match IN
    SELECT
      m.id,
      m.tournament_id,
      m.home_score,
      m.away_score,
      m.match_date,
      m.updated_at,
      m.home_team_id,
      m.away_team_id,
      t.league_id
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.status = 'finished'
    ORDER BY m.match_date DESC
  LOOP
    BEGIN
      v_inserted := false;
      v_error := NULL;
      v_league_id := v_match.league_id;
      v_tournament_id := v_match.tournament_id;

      -- Check if this match already has a knowledge base entry
      IF EXISTS (
        SELECT 1
        FROM league_knowledge_base
        WHERE match_id = v_match.id
        AND content_type = 'resultado_partido'
      ) THEN
        -- Skip if already exists
        v_inserted := false;
        v_error := 'Already exists';
      ELSE
        -- Generate match result content
        v_match_content := generate_match_result_content(v_match.id);

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
            valid_from,
            created_at,
            updated_at
          ) VALUES (
            v_league_id,
            v_tournament_id,
            v_match.id,
            'resultado_partido',
            v_match_content,
            jsonb_build_object(
              'match_id', v_match.id,
              'home_team_id', v_match.home_team_id,
              'away_team_id', v_match.away_team_id,
              'home_score', v_match.home_score,
              'away_score', v_match.away_score,
              'match_date', v_match.match_date,
              'finalized_at', v_match.updated_at,
              'migrated', true
            ),
            true,
            v_match.match_date,
            v_match.updated_at,  -- Use match's update time as created time
            NOW()
          );

          v_inserted := true;
          v_error := NULL;

          RAISE NOTICE 'Knowledge base entry created for match %', v_match.id;
        ELSE
          v_inserted := false;
          v_error := 'No content generated';
        END IF;
      END IF;

      -- Return result for this match
      match_id := v_match.id;
      league_id := v_league_id;
      tournament_id := v_tournament_id;
      inserted := v_inserted;
      error_message := v_error;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Catch any errors and continue with next match
      match_id := v_match.id;
      league_id := v_league_id;
      tournament_id := v_tournament_id;
      inserted := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. EXECUTE THE FUNCTION TO POPULATE DATA
-- ============================================================================

-- Execute and show results
DO $$
DECLARE
  v_total INTEGER := 0;
  v_inserted INTEGER := 0;
  v_skipped INTEGER := 0;
  v_errors INTEGER := 0;
  v_result RECORD;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Starting migration: Populating knowledge base with finished matches';
  RAISE NOTICE '============================================================';

  -- Process all finished matches
  FOR v_result IN
    SELECT * FROM populate_knowledge_base_with_finished_matches()
  LOOP
    v_total := v_total + 1;

    IF v_result.inserted THEN
      v_inserted := v_inserted + 1;
    ELSIF v_result.error_message = 'Already exists' THEN
      v_skipped := v_skipped + 1;
    ELSE
      v_errors := v_errors + 1;
      RAISE WARNING 'Error processing match %: %', v_result.match_id, v_result.error_message;
    END IF;
  END LOOP;

  -- Print summary
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Migration complete!';
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'Total matches processed: %', v_total;
  RAISE NOTICE 'Successfully inserted: %', v_inserted;
  RAISE NOTICE 'Skipped (already exist): %', v_skipped;
  RAISE NOTICE 'Errors: %', v_errors;
  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- 3. REFRESH LEAGUE KNOWLEDGE FOR ALL ACTIVE LEAGUES
-- ============================================================================

-- After populating individual match results, refresh the general knowledge
-- (standings, recent results, suspensions, etc.) for all leagues
DO $$
DECLARE
  v_league RECORD;
  v_count INTEGER;
BEGIN
  RAISE NOTICE 'Refreshing general knowledge for all active leagues...';

  FOR v_league IN
    SELECT id, name FROM leagues WHERE is_active = true
  LOOP
    BEGIN
      v_count := refresh_league_knowledge(v_league.id, NULL);
      RAISE NOTICE 'Refreshed knowledge for league "%" (% items)', v_league.name, v_count;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error refreshing knowledge for league "%": %', v_league.name, SQLERRM;
    END;
  END LOOP;

  RAISE NOTICE 'League knowledge refresh complete!';
END $$;

-- ============================================================================
-- 4. VERIFICATION QUERIES
-- ============================================================================

-- Show statistics about the populated knowledge base
DO $$
DECLARE
  v_stats RECORD;
BEGIN
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Knowledge Base Statistics';
  RAISE NOTICE '============================================================';

  -- Count entries by content type
  FOR v_stats IN
    SELECT
      content_type,
      COUNT(*) as total,
      COUNT(embedding) as with_embeddings,
      COUNT(match_id) as with_match_id
    FROM league_knowledge_base
    GROUP BY content_type
    ORDER BY content_type
  LOOP
    RAISE NOTICE 'Type: % | Total: % | With embeddings: % | With match_id: %',
      v_stats.content_type,
      v_stats.total,
      v_stats.with_embeddings,
      v_stats.with_match_id;
  END LOOP;

  RAISE NOTICE '============================================================';
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON FUNCTION populate_knowledge_base_with_finished_matches IS 'One-time migration function to populate knowledge base with all existing finished matches';
