-- +goose Up
-- sync_qr_to_player_stats() (trigger on asistencias_qr) and two related
-- functions use ON CONFLICT (player_id, match_id), but the only unique index
-- was partial (WHERE match_id IS NOT NULL), which ON CONFLICT cannot infer
-- without the predicate: every QR attendance insert failed with 42P10.
-- A non-partial unique index enforces the same rule (NULL match_id values
-- are distinct) and is a valid ON CONFLICT arbiter.
CREATE UNIQUE INDEX IF NOT EXISTS player_stats_player_match_key ON public.player_stats (player_id, match_id);

-- +goose Down
DROP INDEX IF EXISTS public.player_stats_player_match_key;
