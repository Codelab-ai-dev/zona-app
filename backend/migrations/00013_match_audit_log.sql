-- +goose Up
-- Corrections that undo official match data (reopening a finished match,
-- deleting an attendance record) are recorded here with who, when, why and
-- what was there before (#53). There is no FK to matches on purpose: the
-- record must survive if the match is later deleted.
CREATE TABLE public.match_audit_log (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id   uuid NOT NULL,
    league_id  uuid NOT NULL,
    action     text NOT NULL CHECK (action IN ('reopen_match', 'delete_attendance')),
    reason     text NOT NULL CHECK (length(btrim(reason)) >= 5),
    actor_id   uuid REFERENCES public.users(id) ON DELETE SET NULL,
    details    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX match_audit_log_match_idx ON public.match_audit_log (match_id, created_at DESC);
CREATE INDEX match_audit_log_league_idx ON public.match_audit_log (league_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS public.match_audit_log;
