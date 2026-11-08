-- +goose Up
-- Deleting a league must not be blocked by assistant conversations.
ALTER TABLE public.agent_conversations DROP CONSTRAINT IF EXISTS agent_conversations_league_id_fkey;
ALTER TABLE public.agent_conversations ADD CONSTRAINT agent_conversations_league_id_fkey
    FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

-- +goose Down
ALTER TABLE public.agent_conversations DROP CONSTRAINT IF EXISTS agent_conversations_league_id_fkey;
ALTER TABLE public.agent_conversations ADD CONSTRAINT agent_conversations_league_id_fkey
    FOREIGN KEY (league_id) REFERENCES public.leagues(id);
