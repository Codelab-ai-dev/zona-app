-- +goose Up
-- Match events (match_goals / match_cards) are the single source of truth.
-- Results entered with events never reached player_stats, so top scorers,
-- discipline and player stats ignored them. player_stats rows of a match are
-- now rebuilt from its events when the result is saved.

-- The legacy trigger did the opposite (stats -> events with made-up minutes)
-- and would duplicate the goals the rebuild writes.
DROP TRIGGER IF EXISTS sync_player_stats_trigger ON public.player_stats;

-- QR attendance means "played the match". The legacy version stored the
-- attendance count as assists and its ON CONFLICT could not use the partial
-- unique index.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.sync_qr_to_player_stats() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.player_stats (player_id, match_id, minutes_played)
    VALUES (NEW.player_id, NEW.match_id, 90)
    ON CONFLICT (player_id, match_id) WHERE match_id IS NOT NULL DO NOTHING;
    RETURN NEW;
END;
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.rebuild_match_player_stats(p_match_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.player_stats
    SET goals = 0, assists = 0, yellow_cards = 0, red_cards = 0
    WHERE match_id = p_match_id;

    INSERT INTO public.player_stats (player_id, match_id, goals, assists, yellow_cards, red_cards)
    SELECT e.player_id, p_match_id,
           sum(e.goals), sum(e.assists), LEAST(sum(e.yellow), 2), LEAST(sum(e.red), 1)
    FROM (
        SELECT g.player_id, (g.goal_type IS DISTINCT FROM 'own_goal')::int AS goals, 0 AS assists, 0 AS yellow, 0 AS red
        FROM public.match_goals g WHERE g.match_id = p_match_id
        UNION ALL
        SELECT g.assist_player_id, 0, 1, 0, 0
        FROM public.match_goals g WHERE g.match_id = p_match_id AND g.assist_player_id IS NOT NULL
        UNION ALL
        SELECT c.player_id, 0, 0, (c.card_type = 'yellow')::int, (c.card_type = 'red')::int
        FROM public.match_cards c WHERE c.match_id = p_match_id
    ) e
    GROUP BY e.player_id
    ON CONFLICT (player_id, match_id) WHERE match_id IS NOT NULL DO UPDATE SET
        goals = EXCLUDED.goals, assists = EXCLUDED.assists,
        yellow_cards = EXCLUDED.yellow_cards, red_cards = EXCLUDED.red_cards;

    -- Rows left empty (player removed from the events, no attendance).
    DELETE FROM public.player_stats ps
    WHERE ps.match_id = p_match_id
      AND ps.goals = 0 AND ps.assists = 0 AND ps.yellow_cards = 0 AND ps.red_cards = 0
      AND COALESCE(ps.minutes_played, 0) = 0
      AND NOT EXISTS (SELECT 1 FROM public.asistencias_qr a WHERE a.match_id = ps.match_id AND a.player_id = ps.player_id);
END;
$$;
-- +goose StatementEnd

-- Backfill matches that already have events.
SELECT public.rebuild_match_player_stats(m.id)
FROM (SELECT match_id AS id FROM public.match_goals UNION SELECT match_id FROM public.match_cards) m;

-- +goose Down
DROP FUNCTION IF EXISTS public.rebuild_match_player_stats(uuid);
CREATE TRIGGER sync_player_stats_trigger AFTER INSERT OR UPDATE ON public.player_stats
    FOR EACH ROW WHEN (NEW.match_id IS NOT NULL) EXECUTE FUNCTION public.sync_player_stats_to_cedula();
