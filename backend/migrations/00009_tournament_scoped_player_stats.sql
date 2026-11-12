-- +goose Up
-- Top scorers and discipline were computed per LEAGUE even though the API
-- asks per tournament, so every tournament showed the goals of all of
-- them. Manual ("extemporaneous") stats had no tournament at all.

-- Manual adjustments: one row per player and tournament, without a match
-- (the legacy index allowed only one per player across all tournaments).
DROP INDEX IF EXISTS public.idx_player_stats_unique_extemporaneous;
ALTER TABLE public.player_stats
    ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS player_stats_manual_unique
    ON public.player_stats (player_id, tournament_id) WHERE match_id IS NULL;
-- A manual row must say which tournament it belongs to.
ALTER TABLE public.player_stats DROP CONSTRAINT IF EXISTS player_stats_manual_has_tournament;
ALTER TABLE public.player_stats ADD CONSTRAINT player_stats_manual_has_tournament
    CHECK (match_id IS NOT NULL OR tournament_id IS NOT NULL) NOT VALID;

-- Legacy triggers mirror player_stats into match goals/cards and team card
-- totals; they assume a match, so manual rows must not fire them.
DROP TRIGGER IF EXISTS sync_player_stats_trigger ON public.player_stats;
CREATE TRIGGER sync_player_stats_trigger AFTER INSERT OR UPDATE ON public.player_stats
    FOR EACH ROW WHEN (NEW.match_id IS NOT NULL) EXECUTE FUNCTION public.sync_player_stats_to_cedula();
DROP TRIGGER IF EXISTS trigger_update_team_cards_from_player_stats ON public.player_stats;
CREATE TRIGGER trigger_update_team_cards_from_player_stats AFTER INSERT OR UPDATE ON public.player_stats
    FOR EACH ROW WHEN (NEW.match_id IS NOT NULL) EXECUTE FUNCTION public.update_team_cards_from_player_stats();

-- Stats of a tournament: rows of its matches plus its manual rows.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.tournament_player_totals(p_tournament_id uuid)
RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text,
              team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint,
              yellow_cards bigint, red_cards bigint, minutes_played bigint)
LANGUAGE sql STABLE AS $$
    SELECT p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name,
           count(ps.match_id),
           COALESCE(sum(ps.goals), 0), COALESCE(sum(ps.assists), 0),
           COALESCE(sum(ps.yellow_cards), 0), COALESCE(sum(ps.red_cards), 0),
           COALESCE(sum(ps.minutes_played), 0)
    FROM public.player_stats ps
    JOIN public.players p ON p.id = ps.player_id
    JOIN public.teams t ON t.id = p.team_id
    LEFT JOIN public.matches m ON m.id = ps.match_id
    WHERE (m.tournament_id = p_tournament_id OR (ps.match_id IS NULL AND ps.tournament_id = p_tournament_id))
    GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.get_top_scorers_by_tournament(p_tournament_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text,
              team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint,
              yellow_cards bigint, red_cards bigint, minutes_played bigint)
LANGUAGE sql STABLE AS $$
    SELECT * FROM public.tournament_player_totals(p_tournament_id) s
    WHERE s.goals > 0 ORDER BY s.goals DESC, s.assists DESC, s.player_name LIMIT p_limit
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.get_discipline_by_tournament(p_tournament_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text,
              team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint,
              yellow_cards bigint, red_cards bigint, minutes_played bigint)
LANGUAGE sql STABLE AS $$
    SELECT * FROM public.tournament_player_totals(p_tournament_id) s
    WHERE s.yellow_cards + s.red_cards > 0
    ORDER BY s.yellow_cards + s.red_cards * 3 DESC, s.yellow_cards DESC, s.player_name LIMIT p_limit
$$;
-- +goose StatementEnd

-- +goose Down
DROP TRIGGER IF EXISTS sync_player_stats_trigger ON public.player_stats;
CREATE TRIGGER sync_player_stats_trigger AFTER INSERT OR UPDATE ON public.player_stats
    FOR EACH ROW EXECUTE FUNCTION public.sync_player_stats_to_cedula();
DROP TRIGGER IF EXISTS trigger_update_team_cards_from_player_stats ON public.player_stats;
CREATE TRIGGER trigger_update_team_cards_from_player_stats AFTER INSERT OR UPDATE ON public.player_stats
    FOR EACH ROW EXECUTE FUNCTION public.update_team_cards_from_player_stats();
DROP FUNCTION IF EXISTS public.get_discipline_by_tournament(uuid, integer);
DROP FUNCTION IF EXISTS public.get_top_scorers_by_tournament(uuid, integer);
DROP FUNCTION IF EXISTS public.tournament_player_totals(uuid);
ALTER TABLE public.player_stats DROP CONSTRAINT IF EXISTS player_stats_manual_has_tournament;
DROP INDEX IF EXISTS public.player_stats_manual_unique;
ALTER TABLE public.player_stats DROP COLUMN IF EXISTS tournament_id;
