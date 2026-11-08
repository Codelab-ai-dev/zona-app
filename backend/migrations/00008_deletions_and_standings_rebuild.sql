-- +goose Up
-- Support permanently deleting tournaments and teams.

-- 1. Conversations of the AI assistant must not block deleting a tournament.
ALTER TABLE public.agent_conversations
    DROP CONSTRAINT IF EXISTS agent_conversations_tournament_id_fkey;
ALTER TABLE public.agent_conversations
    ADD CONSTRAINT agent_conversations_tournament_id_fkey
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;

-- 2. The legacy rebuild only "touched" finished matches, but the stats
--    trigger fires on a status *change*, so it emptied the standings instead.
--    Recompute team_stats from the finished matches in one statement,
--    keeping manual point adjustments. Used after deleting a team (its
--    matches cascade away and rivals' standings must drop those results).
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION public.rebuild_team_stats_for_tournament(tournament_id_param uuid)
RETURNS void LANGUAGE sql AS $$
    WITH results AS (
        SELECT home_team_id AS team_id, COALESCE(home_score, 0) AS gf, COALESCE(away_score, 0) AS ga, match_date
        FROM public.matches WHERE tournament_id = tournament_id_param AND status = 'finished'
        UNION ALL
        SELECT away_team_id, COALESCE(away_score, 0), COALESCE(home_score, 0), match_date
        FROM public.matches WHERE tournament_id = tournament_id_param AND status = 'finished'
    ), agg AS (
        SELECT team_id,
               count(*)::int                                   AS played,
               count(*) FILTER (WHERE gf > ga)::int            AS won,
               count(*) FILTER (WHERE gf = ga)::int            AS drawn,
               count(*) FILTER (WHERE gf < ga)::int            AS lost,
               sum(gf)::int                                    AS goals_for,
               sum(ga)::int                                    AS goals_against,
               count(*) FILTER (WHERE ga = 0)::int             AS clean_sheets,
               COALESCE(max(gf - ga) FILTER (WHERE gf > ga), 0) AS biggest_win,
               COALESCE(max(ga - gf) FILTER (WHERE gf < ga), 0) AS biggest_loss,
               max(match_date)                                 AS last_match,
               max(match_date) FILTER (WHERE gf > ga)          AS last_win
        FROM results GROUP BY team_id
    ), cleared AS (
        UPDATE public.team_stats SET
            matches_played = 0, matches_won = 0, matches_drawn = 0, matches_lost = 0,
            goals_for = 0, goals_against = 0, clean_sheets = 0,
            biggest_win_margin = 0, biggest_loss_margin = 0,
            last_match_date = NULL, last_win_date = NULL, updated_at = now()
        WHERE tournament_id = tournament_id_param
          AND team_id NOT IN (SELECT team_id FROM agg)
    )
    INSERT INTO public.team_stats (team_id, tournament_id, league_id, matches_played, matches_won,
        matches_drawn, matches_lost, goals_for, goals_against, clean_sheets,
        biggest_win_margin, biggest_loss_margin, last_match_date, last_win_date)
    SELECT a.team_id, tournament_id_param, t.league_id, a.played, a.won, a.drawn, a.lost,
           a.goals_for, a.goals_against, a.clean_sheets, a.biggest_win, a.biggest_loss,
           a.last_match, a.last_win
    FROM agg a JOIN public.teams t ON t.id = a.team_id
    ON CONFLICT (team_id, tournament_id) DO UPDATE SET
        matches_played = EXCLUDED.matches_played, matches_won = EXCLUDED.matches_won,
        matches_drawn = EXCLUDED.matches_drawn, matches_lost = EXCLUDED.matches_lost,
        goals_for = EXCLUDED.goals_for, goals_against = EXCLUDED.goals_against,
        clean_sheets = EXCLUDED.clean_sheets,
        biggest_win_margin = EXCLUDED.biggest_win_margin, biggest_loss_margin = EXCLUDED.biggest_loss_margin,
        last_match_date = EXCLUDED.last_match_date, last_win_date = EXCLUDED.last_win_date,
        updated_at = now();
$$;
-- +goose StatementEnd

-- +goose Down
ALTER TABLE public.agent_conversations
    DROP CONSTRAINT IF EXISTS agent_conversations_tournament_id_fkey;
ALTER TABLE public.agent_conversations
    ADD CONSTRAINT agent_conversations_tournament_id_fkey
    FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);
