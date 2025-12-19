-- ============================================================================
-- ADD match_league_knowledge FUNCTION FOR AGENT SERVICE
-- Migration: 20251218000001_add_match_league_knowledge_function.sql
--
-- Purpose: Create the match_league_knowledge function with the correct signature
-- that the Agent Service expects
-- ============================================================================

CREATE OR REPLACE FUNCTION match_league_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  filter_league_id UUID DEFAULT NULL,
  filter_tournament_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  content_type TEXT,
  metadata JSONB,
  league_id UUID,
  tournament_id UUID,
  match_id UUID,
  distance FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content_text as content,
    kb.content_type,
    kb.metadata,
    kb.league_id,
    kb.tournament_id,
    (kb.metadata->>'match_id')::UUID as match_id,
    (kb.embedding <=> query_embedding) as distance
  FROM league_knowledge_base kb
  WHERE
    -- Filter by league if provided
    (filter_league_id IS NULL OR kb.league_id = filter_league_id)
    -- Filter by tournament if provided
    AND (filter_tournament_id IS NULL OR kb.tournament_id = filter_tournament_id)
    -- Only return results with embeddings
    AND kb.embedding IS NOT NULL
    -- Only return valid knowledge (not expired)
    AND (kb.valid_until IS NULL OR kb.valid_until > NOW())
    -- Filter by similarity threshold (convert distance to similarity)
    AND (1 - (kb.embedding <=> query_embedding)) >= match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION match_league_knowledge TO authenticated;
GRANT EXECUTE ON FUNCTION match_league_knowledge TO anon;

-- Add comment
COMMENT ON FUNCTION match_league_knowledge IS 'Vector similarity search for league knowledge base. Used by Agent Service for RAG queries.';
