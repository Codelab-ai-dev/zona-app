-- +goose Up
-- Suspensions now count the matches they are served in (#81). Nothing ever
-- incremented matches_served, so a suspension stayed active until an admin
-- completed it by hand.
--
-- A match counts for an active suspension when the player's team finishes
-- a later match of the same league (and tournament, when the suspension has
-- one): apply_suspensions_for_match(match), called when a result is saved.
-- suspension_match_applications is the record; a trigger keeps
-- matches_served and the status in step with it, also when a match is
-- reopened or deleted (its applications go, the suspension comes back).

-- One application per suspension and match. The old ON CONFLICT DO NOTHING
-- had no constraint to hit, so duplicates were possible: keep the first.
DELETE FROM public.suspension_match_applications a
USING public.suspension_match_applications b
WHERE a.suspension_id = b.suspension_id AND a.match_id = b.match_id
  AND (a.applied_at, a.id) > (b.applied_at, b.id);
ALTER TABLE public.suspension_match_applications
    ADD CONSTRAINT suspension_match_applications_once UNIQUE (suspension_id, match_id);

-- Completed by served matches (true) or by an admin (false): only the first
-- comes back to active when one of its matches is undone.
ALTER TABLE public.player_suspensions ADD COLUMN auto_completed boolean NOT NULL DEFAULT false;

-- +goose StatementBegin
CREATE FUNCTION public.sync_suspension_served(p_suspension_id uuid) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE public.player_suspensions ps
    SET matches_served = LEAST(c.n, ps.matches_to_serve),
        status = CASE
            WHEN ps.status = 'active' AND c.n >= ps.matches_to_serve THEN 'completed'::public.suspension_status
            WHEN ps.status = 'completed' AND ps.auto_completed AND c.n < ps.matches_to_serve THEN 'active'::public.suspension_status
            ELSE ps.status END,
        auto_completed = CASE
            WHEN ps.status = 'active' AND c.n >= ps.matches_to_serve THEN true
            WHEN ps.status = 'completed' AND ps.auto_completed AND c.n < ps.matches_to_serve THEN false
            ELSE ps.auto_completed END,
        end_date = CASE
            WHEN ps.status = 'active' AND c.n >= ps.matches_to_serve THEN now()
            WHEN ps.status = 'completed' AND ps.auto_completed AND c.n < ps.matches_to_serve THEN NULL
            ELSE ps.end_date END,
        updated_at = now()
    FROM (SELECT count(*)::int AS n FROM public.suspension_match_applications WHERE suspension_id = p_suspension_id) c
    WHERE ps.id = p_suspension_id;
END;
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION public.sync_suspension_served_trigger() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    PERFORM public.sync_suspension_served(COALESCE(NEW.suspension_id, OLD.suspension_id));
    RETURN NULL;
END;
$$;
-- +goose StatementEnd

CREATE TRIGGER suspension_served_sync
    AFTER INSERT OR DELETE ON public.suspension_match_applications
    FOR EACH ROW EXECUTE FUNCTION public.sync_suspension_served_trigger();

-- +goose StatementBegin
CREATE FUNCTION public.apply_suspensions_for_match(p_match_id uuid) RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
    applied integer;
BEGIN
    INSERT INTO public.suspension_match_applications (suspension_id, match_id)
    SELECT ps.id, m.id
    FROM public.matches m
    JOIN public.tournaments t ON t.id = m.tournament_id
    JOIN public.player_suspensions ps
      ON ps.team_id IN (m.home_team_id, m.away_team_id)
     AND ps.league_id = t.league_id
     AND (ps.tournament_id IS NULL OR ps.tournament_id = m.tournament_id)
    LEFT JOIN public.matches origin ON origin.id = ps.match_id
    WHERE m.id = p_match_id
      AND m.status = 'finished'
      AND ps.status = 'active'
      AND ps.matches_served < ps.matches_to_serve
      AND ps.match_id IS DISTINCT FROM m.id
      -- Only matches played after the one that caused it (or after it
      -- started, for suspensions without an origin match).
      AND m.match_date > COALESCE(origin.match_date, ps.start_date)
    ON CONFLICT (suspension_id, match_id) DO NOTHING;
    GET DIAGNOSTICS applied = ROW_COUNT;
    RETURN applied;
END;
$$;
-- +goose StatementEnd

-- Applications recorded before this migration now count.
SELECT public.sync_suspension_served(s.suspension_id)
FROM (SELECT DISTINCT suspension_id FROM public.suspension_match_applications) s;

-- +goose Down
DROP TRIGGER IF EXISTS suspension_served_sync ON public.suspension_match_applications;
DROP FUNCTION IF EXISTS public.sync_suspension_served_trigger();
DROP FUNCTION IF EXISTS public.sync_suspension_served(uuid);
DROP FUNCTION IF EXISTS public.apply_suspensions_for_match(uuid);
ALTER TABLE public.player_suspensions DROP COLUMN IF EXISTS auto_completed;
ALTER TABLE public.suspension_match_applications DROP CONSTRAINT IF EXISTS suspension_match_applications_once;
