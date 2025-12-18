-- ============================================================================
-- VECTOR KNOWLEDGE BASE FOR AI AGENT (WhatsApp Integration)
-- Migration: 20251214000001_create_vector_knowledge_base.sql
--
-- Purpose: Create vector database for AI agent to answer questions about:
-- - Jornadas (weekly matches)
-- - Tabla de posiciones (standings)
-- - Suspensiones (player suspensions)
-- - Marcadores (match results)
-- ============================================================================

-- ============================================================================
-- 1. ENABLE PGVECTOR EXTENSION
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 2. CREATE KNOWLEDGE BASE TABLE WITH VECTOR EMBEDDINGS
-- ============================================================================

-- Main table to store vectorized knowledge
CREATE TABLE league_knowledge_base (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- Relationships
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Content type categorization
  content_type TEXT NOT NULL CHECK (content_type IN (
    'jornada',           -- Weekly matches schedule
    'tabla_posiciones',  -- League standings/table
    'suspensiones',      -- Active suspensions
    'resultados',        -- Match results
    'estadisticas',      -- Player/team statistics
    'proximo_partido'    -- Next match info
  )),

  -- Textual content (what the AI reads)
  content_text TEXT NOT NULL,

  -- Structured metadata (for filtering and context)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Vector embedding (1536 dimensions for OpenAI text-embedding-ada-002)
  -- Adjust dimensions based on your embedding model:
  -- - OpenAI ada-002: 1536
  -- - Cohere embed-multilingual-v3: 1024
  -- - all-MiniLM-L6-v2: 384
  embedding vector(1536),

  -- Validity period (for time-sensitive information)
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,

  -- Auto-generated or manual
  is_auto_generated BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure content is not empty
  CONSTRAINT knowledge_base_content_not_empty CHECK (LENGTH(content_text) > 0)
);

-- ============================================================================
-- 3. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Standard indexes
CREATE INDEX idx_knowledge_base_league_id ON league_knowledge_base(league_id);
CREATE INDEX idx_knowledge_base_tournament_id ON league_knowledge_base(tournament_id);
CREATE INDEX idx_knowledge_base_content_type ON league_knowledge_base(content_type);
CREATE INDEX idx_knowledge_base_valid_until ON league_knowledge_base(valid_until);
CREATE INDEX idx_knowledge_base_created_at ON league_knowledge_base(created_at DESC);

-- GIN index for JSONB metadata (fast filtering)
CREATE INDEX idx_knowledge_base_metadata ON league_knowledge_base USING gin(metadata);

-- HNSW index for vector similarity search (fast cosine similarity)
-- m = 16 (number of connections, higher = more accurate but slower)
-- ef_construction = 64 (quality of index, higher = better quality)
CREATE INDEX idx_knowledge_base_embedding ON league_knowledge_base
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for common queries
CREATE INDEX idx_knowledge_base_league_type ON league_knowledge_base(league_id, content_type);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE league_knowledge_base ENABLE ROW LEVEL SECURITY;

-- Public can read knowledge (for AI agent queries)
CREATE POLICY "Anyone can read knowledge base" ON league_knowledge_base
  FOR SELECT USING (true);

-- League admins can manage their league's knowledge
CREATE POLICY "League admins can manage their knowledge" ON league_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = league_knowledge_base.league_id
      AND l.admin_id = auth.uid()
    )
  );

-- Super admins can manage all knowledge
CREATE POLICY "Super admins can manage all knowledge" ON league_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- ============================================================================
-- 5. HELPER FUNCTIONS FOR CONTENT GENERATION
-- ============================================================================

-- Function to generate "jornada" (weekly matches) content
CREATE OR REPLACE FUNCTION generate_jornada_content(
  p_league_id UUID,
  p_tournament_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '7 days'
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'📅 JORNADA SEMANAL\nLiga: %s\nTorneo: %s\nPeríodo: %s al %s\n\n',
    v_league_name,
    COALESCE(v_tournament_name, 'Todos los torneos'),
    TO_CHAR(p_start_date, 'DD/MM/YYYY'),
    TO_CHAR(p_end_date, 'DD/MM/YYYY')
  );

  v_content := v_content || E'PARTIDOS:\n';

  -- Get matches in the date range
  FOR v_match IN
    SELECT
      m.id,
      TO_CHAR(m.match_date, 'DD/MM/YYYY HH24:MI') as fecha,
      TO_CHAR(m.match_date, 'Day') as dia_semana,
      ht.name as equipo_local,
      at.name as equipo_visitante,
      m.home_score,
      m.away_score,
      m.status
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.match_date::DATE BETWEEN p_start_date AND p_end_date
    ORDER BY m.match_date
  LOOP
    v_content := v_content || format(
      E'• %s, %s: %s vs %s',
      TRIM(v_match.dia_semana),
      v_match.fecha,
      v_match.equipo_local,
      v_match.equipo_visitante
    );

    -- Add score if match is finished or in progress
    IF v_match.status IN ('finished', 'in_progress') THEN
      v_content := v_content || format(' [%s-%s]', v_match.home_score, v_match.away_score);
    END IF;

    -- Add status
    v_content := v_content || format(
      ' - %s',
      CASE v_match.status
        WHEN 'scheduled' THEN 'Programado'
        WHEN 'in_progress' THEN '⚽ EN VIVO'
        WHEN 'finished' THEN 'Finalizado'
        WHEN 'cancelled' THEN 'Cancelado'
      END
    );

    v_content := v_content || E'\n';
  END LOOP;

  -- If no matches found
  IF NOT FOUND THEN
    v_content := v_content || E'No hay partidos programados para esta semana.\n';
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to generate "tabla de posiciones" (standings) content
CREATE OR REPLACE FUNCTION generate_standings_content(
  p_league_id UUID,
  p_tournament_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_team RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_position INTEGER := 0;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'🏆 TABLA DE POSICIONES\nLiga: %s\nTorneo: %s\n\n',
    v_league_name,
    COALESCE(v_tournament_name, 'General')
  );

  v_content := v_content || format(
    E'%-3s %-20s %3s %3s %3s %3s %4s %4s %4s %5s\n',
    'POS', 'EQUIPO', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'PTS'
  );
  v_content := v_content || REPEAT('-', 70) || E'\n';

  -- Get standings ordered by points, goal difference
  FOR v_team IN
    SELECT
      t.name as team_name,
      ts.matches_played as pj,
      ts.matches_won as pg,
      ts.matches_drawn as pe,
      ts.matches_lost as pp,
      ts.goals_for as gf,
      ts.goals_against as gc,
      ts.goal_difference as gd,
      ts.points as pts
    FROM team_stats ts
    JOIN teams t ON ts.team_id = t.id
    WHERE ts.league_id = p_league_id
    AND (p_tournament_id IS NULL OR ts.tournament_id = p_tournament_id)
    ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC
  LOOP
    v_position := v_position + 1;

    v_content := v_content || format(
      E'%-3s %-20s %3s %3s %3s %3s %4s %4s %+4s %5s\n',
      v_position::TEXT,
      LEFT(v_team.team_name, 20),
      v_team.pj::TEXT,
      v_team.pg::TEXT,
      v_team.pe::TEXT,
      v_team.pp::TEXT,
      v_team.gf::TEXT,
      v_team.gc::TEXT,
      v_team.gd::TEXT,
      v_team.pts::TEXT
    );
  END LOOP;

  -- If no teams found
  IF v_position = 0 THEN
    v_content := v_content || E'No hay datos disponibles.\n';
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to generate "suspensiones" (suspensions) content
CREATE OR REPLACE FUNCTION generate_suspensions_content(
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_suspension RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'🚫 JUGADORES SUSPENDIDOS\nLiga: %s\nTorneo: %s\n\n',
    v_league_name,
    COALESCE(v_tournament_name, 'Todos los torneos')
  );

  -- Get active suspensions
  FOR v_suspension IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      t.name as team_name,
      ps.suspension_type,
      ps.reason,
      ps.matches_to_serve,
      ps.matches_served,
      (ps.matches_to_serve - ps.matches_served) as remaining
    FROM player_suspensions ps
    JOIN players p ON ps.player_id = p.id
    JOIN teams t ON ps.team_id = t.id
    WHERE ps.league_id = p_league_id
    AND (p_tournament_id IS NULL OR ps.tournament_id = p_tournament_id)
    AND ps.status = 'active'
    AND ps.matches_served < ps.matches_to_serve
    ORDER BY t.name, p.name
  LOOP
    v_content := v_content || format(
      E'• %s (#%s) - %s\n  Motivo: %s\n  Partidos restantes: %s de %s\n\n',
      v_suspension.player_name,
      COALESCE(v_suspension.jersey_number::TEXT, 'S/N'),
      v_suspension.team_name,
      v_suspension.reason,
      v_suspension.remaining::TEXT,
      v_suspension.matches_to_serve::TEXT
    );
  END LOOP;

  -- If no suspensions found
  IF NOT FOUND THEN
    v_content := v_content || E'✅ No hay jugadores suspendidos en este momento.\n';
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- Function to generate recent results content
CREATE OR REPLACE FUNCTION generate_results_content(
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 10
)
RETURNS TEXT AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'⚽ RESULTADOS RECIENTES\nLiga: %s\nTorneo: %s\n\n',
    v_league_name,
    COALESCE(v_tournament_name, 'Todos los torneos')
  );

  -- Get recent finished matches
  FOR v_match IN
    SELECT
      TO_CHAR(m.match_date, 'DD/MM/YYYY') as fecha,
      ht.name as equipo_local,
      at.name as equipo_visitante,
      m.home_score,
      m.away_score
    FROM matches m
    JOIN teams ht ON m.home_team_id = ht.id
    JOIN teams at ON m.away_team_id = at.id
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.status = 'finished'
    ORDER BY m.match_date DESC
    LIMIT p_limit
  LOOP
    v_content := v_content || format(
      E'• %s: %s %s-%s %s\n',
      v_match.fecha,
      v_match.equipo_local,
      v_match.home_score,
      v_match.away_score,
      v_match.equipo_visitante
    );
  END LOOP;

  -- If no results found
  IF NOT FOUND THEN
    v_content := v_content || E'No hay resultados recientes disponibles.\n';
  END IF;

  RETURN v_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. FUNCTION TO REFRESH KNOWLEDGE BASE
-- ============================================================================

-- Main function to refresh all knowledge for a league/tournament
CREATE OR REPLACE FUNCTION refresh_league_knowledge(
  p_league_id UUID,
  p_tournament_id UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
  v_jornada_content TEXT;
  v_standings_content TEXT;
  v_suspensions_content TEXT;
  v_results_content TEXT;
BEGIN
  -- Delete old auto-generated knowledge for this league/tournament
  DELETE FROM league_knowledge_base
  WHERE league_id = p_league_id
  AND (p_tournament_id IS NULL OR tournament_id = p_tournament_id)
  AND is_auto_generated = true;

  -- Generate and insert "jornada" content (next 7 days)
  v_jornada_content := generate_jornada_content(
    p_league_id,
    p_tournament_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days'
  );

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    valid_until,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'jornada',
    v_jornada_content,
    jsonb_build_object(
      'start_date', CURRENT_DATE,
      'end_date', CURRENT_DATE + INTERVAL '7 days'
    ),
    CURRENT_DATE + INTERVAL '7 days',
    true
  );
  v_count := v_count + 1;

  -- Generate and insert standings
  v_standings_content := generate_standings_content(p_league_id, p_tournament_id);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'tabla_posiciones',
    v_standings_content,
    jsonb_build_object('generated_at', NOW()),
    true
  );
  v_count := v_count + 1;

  -- Generate and insert suspensions
  v_suspensions_content := generate_suspensions_content(p_league_id, p_tournament_id);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'suspensiones',
    v_suspensions_content,
    jsonb_build_object('generated_at', NOW()),
    true
  );
  v_count := v_count + 1;

  -- Generate and insert recent results
  v_results_content := generate_results_content(p_league_id, p_tournament_id, 10);

  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'resultados',
    v_results_content,
    jsonb_build_object('generated_at', NOW(), 'limit', 10),
    true
  );
  v_count := v_count + 1;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. FUNCTION FOR VECTOR SIMILARITY SEARCH
-- ============================================================================

-- Search knowledge base using vector similarity
-- NOTE: Embeddings must be inserted from your application (n8n workflow)
CREATE OR REPLACE FUNCTION search_league_knowledge(
  p_query_embedding vector(1536),
  p_league_id UUID,
  p_limit INTEGER DEFAULT 5,
  p_similarity_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
  id UUID,
  content_type TEXT,
  content_text TEXT,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.id,
    kb.content_type,
    kb.content_text,
    kb.metadata,
    1 - (kb.embedding <=> p_query_embedding) as similarity
  FROM league_knowledge_base kb
  WHERE kb.league_id = p_league_id
  AND kb.embedding IS NOT NULL
  AND (kb.valid_until IS NULL OR kb.valid_until > NOW())
  AND 1 - (kb.embedding <=> p_query_embedding) > p_similarity_threshold
  ORDER BY kb.embedding <=> p_query_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. SCHEDULED REFRESH (Optional - can be called from n8n cron)
-- ============================================================================

-- Function to refresh all active leagues
CREATE OR REPLACE FUNCTION refresh_all_leagues_knowledge()
RETURNS TABLE (league_id UUID, items_created INTEGER) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id as league_id,
    refresh_league_knowledge(l.id, NULL) as items_created
  FROM leagues l
  WHERE l.is_active = true;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. UTILITY FUNCTIONS
-- ============================================================================

-- Clean expired knowledge
CREATE OR REPLACE FUNCTION clean_expired_knowledge()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM league_knowledge_base
  WHERE valid_until IS NOT NULL
  AND valid_until < NOW()
  AND is_auto_generated = true;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- Get knowledge base stats
CREATE OR REPLACE FUNCTION get_knowledge_base_stats(p_league_id UUID)
RETURNS TABLE (
  content_type TEXT,
  total_items INTEGER,
  with_embeddings INTEGER,
  avg_content_length FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    kb.content_type,
    COUNT(*)::INTEGER as total_items,
    COUNT(kb.embedding)::INTEGER as with_embeddings,
    AVG(LENGTH(kb.content_text))::FLOAT as avg_content_length
  FROM league_knowledge_base kb
  WHERE kb.league_id = p_league_id
  GROUP BY kb.content_type
  ORDER BY kb.content_type;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Comments for documentation
COMMENT ON TABLE league_knowledge_base IS 'Vector database for AI agent to answer questions about leagues, tournaments, matches, standings, and suspensions';
COMMENT ON COLUMN league_knowledge_base.embedding IS 'Vector embedding (1536D for OpenAI ada-002, adjust based on your model)';
COMMENT ON COLUMN league_knowledge_base.content_type IS 'Type of content: jornada, tabla_posiciones, suspensiones, resultados, estadisticas, proximo_partido';
COMMENT ON COLUMN league_knowledge_base.metadata IS 'Additional structured data for filtering and context';
COMMENT ON FUNCTION search_league_knowledge IS 'Semantic search using vector similarity (cosine distance)';
COMMENT ON FUNCTION refresh_league_knowledge IS 'Regenerate all knowledge content for a league/tournament';
