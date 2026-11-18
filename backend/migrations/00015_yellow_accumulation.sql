-- +goose Up
-- Yellow card accumulation (#82), per tournament and off by default: a
-- tournament with yellow_accumulation_limit = N suspends a player for
-- yellow_accumulation_matches matches every N yellow cards (N, 2N, 3N...).
-- Yellows from a match where the same player also saw a red card do not
-- count: that expulsion already has its own suspension.
ALTER TABLE public.tournaments
    ADD COLUMN yellow_accumulation_limit   smallint CHECK (yellow_accumulation_limit BETWEEN 2 AND 20),
    ADD COLUMN yellow_accumulation_matches smallint NOT NULL DEFAULT 1 CHECK (yellow_accumulation_matches BETWEEN 1 AND 10);

-- +goose StatementBegin
-- Called when a match result is saved: creates the accumulation suspensions
-- the match's yellow cards complete. Suspensions already created in other
-- matches, in any status (an admin's cancellation stands), are not created
-- again. Saving this match's result again first drops its own unserved
-- automatic suspensions, as it does for red cards.
CREATE FUNCTION public.generate_yellow_accumulation(p_match_id uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    created integer;
BEGIN
    WITH m AS (
        SELECT mt.id, mt.tournament_id, t.league_id,
               t.yellow_accumulation_limit AS lim, t.yellow_accumulation_matches AS n
        FROM public.matches mt JOIN public.tournaments t ON t.id = mt.tournament_id
        WHERE mt.id = p_match_id AND mt.status = 'finished' AND t.yellow_accumulation_limit IS NOT NULL
    ), booked AS (
        SELECT DISTINCT c.player_id, c.team_id
        FROM public.match_cards c, m
        WHERE c.match_id = m.id AND c.card_type = 'yellow'
    ), totals AS (
        SELECT b.player_id, b.team_id, count(*)::int AS yellows
        FROM booked b
        JOIN public.match_cards c ON c.player_id = b.player_id AND c.card_type = 'yellow'
        JOIN public.matches mm ON mm.id = c.match_id AND mm.status = 'finished'
        JOIN m ON mm.tournament_id = m.tournament_id
        WHERE NOT EXISTS (SELECT 1 FROM public.match_cards r
                          WHERE r.match_id = c.match_id AND r.player_id = c.player_id AND r.card_type = 'red')
        GROUP BY b.player_id, b.team_id
    ), existing AS (
        SELECT ps.player_id, count(*)::int AS n
        FROM public.player_suspensions ps, m
        WHERE ps.suspension_type = 'yellow_accumulation' AND ps.tournament_id = m.tournament_id
        GROUP BY ps.player_id
    )
    INSERT INTO public.player_suspensions
        (player_id, team_id, league_id, tournament_id, suspension_type, reason, matches_to_serve, match_id)
    SELECT t.player_id, t.team_id, m.league_id, m.tournament_id, 'yellow_accumulation',
           format('Acumulación de %s tarjetas amarillas', m.lim * k), m.n, m.id
    FROM totals t
    CROSS JOIN m
    LEFT JOIN existing e ON e.player_id = t.player_id
    CROSS JOIN LATERAL generate_series(COALESCE(e.n, 0) + 1, t.yellows / m.lim) AS k;
    GET DIAGNOSTICS created = ROW_COUNT;
    RETURN created;
END;
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION IF EXISTS public.generate_yellow_accumulation(uuid);
ALTER TABLE public.tournaments
    DROP COLUMN IF EXISTS yellow_accumulation_matches,
    DROP COLUMN IF EXISTS yellow_accumulation_limit;
