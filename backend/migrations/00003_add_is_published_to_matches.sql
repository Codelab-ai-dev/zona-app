-- +goose Up
-- Ported from zona-gol/supabase/migrations/add_is_published_to_matches.sql,
-- which had no timestamp prefix and was skipped by the Supabase CLI but is
-- used by the clients (unpublished matches are visible to admins only).
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_matches_is_published ON public.matches (is_published);

-- +goose Down
DROP INDEX IF EXISTS public.idx_matches_is_published;
ALTER TABLE public.matches DROP COLUMN IF EXISTS is_published;
