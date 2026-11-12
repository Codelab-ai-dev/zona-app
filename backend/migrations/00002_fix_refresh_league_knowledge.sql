-- +goose Up
-- refresh_league_knowledge() called generate_jornada_content(uuid, uuid, date, date)
-- with CURRENT_DATE + INTERVAL '7 days', which is a timestamp, so function
-- resolution failed and every match finishing (trigger
-- trigger_update_knowledge_on_match_finish) raised an error.
-- Fix: pass a date (CURRENT_DATE + 7).
--
-- It also deleted every auto-generated row of the league, including the
-- per-match 'resultado_partido' row the same trigger had just inserted, so
-- match results never reached the AI knowledge base. Those rows are history,
-- not a snapshot, so they are now kept.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.refresh_league_knowledge(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_jornada_content TEXT;
  v_standings_content TEXT;
  v_suspensions_content TEXT;
  v_results_content TEXT;
BEGIN
  -- Delete old auto-generated knowledge for this league/tournament
  DELETE FROM league_knowledge_base
  WHERE league_id = p_league_id
  AND (p_tournament_id IS NULL OR tournament_id = p_tournament_id)
  AND is_auto_generated = true
  AND content_type <> 'resultado_partido';

  -- Generate and insert "jornada" content (next 7 days)
  v_jornada_content := generate_jornada_content(
    p_league_id,
    p_tournament_id,
    CURRENT_DATE,
    CURRENT_DATE + 7
  );

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    valid_until,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'jornada',
    v_jornada_content,
    jsonb_build_object(
      'start_date', CURRENT_DATE,
      'end_date', CURRENT_DATE + INTERVAL '7 days'
    ),
    CURRENT_DATE + INTERVAL '7 days',
    true
  );
  v_count := v_count + 1;

  -- Generate and insert standings
  v_standings_content := generate_standings_content(p_league_id, p_tournament_id);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'tabla_posiciones',
    v_standings_content,
    jsonb_build_object('generated_at', NOW()),
    true
  );
  v_count := v_count + 1;

  -- Generate and insert suspensions
  v_suspensions_content := generate_suspensions_content(p_league_id, p_tournament_id);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'suspensiones',
    v_suspensions_content,
    jsonb_build_object('generated_at', NOW()),
    true
  );
  v_count := v_count + 1;

  -- Generate and insert recent results
  v_results_content := generate_results_content(p_league_id, p_tournament_id, 10);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'resultados',
    v_results_content,
    jsonb_build_object('generated_at', NOW(), 'limit', 10),
    true
  );
  v_count := v_count + 1;

  RETURN v_count;
END;
$$;
-- +goose StatementEnd

-- +goose Down
-- Intentionally irreversible: the previous definition was broken.
