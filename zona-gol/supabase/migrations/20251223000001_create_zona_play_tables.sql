-- ============================================
-- ZONA-PLAY: Tablas de Video y Contenido
-- Migration: 20251223000001_create_zona_play_tables.sql
-- ============================================

-- 1. GRABACIONES DE PARTIDOS (Videos completos)
CREATE TABLE match_recordings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,

  -- Fuente del video
  source_type TEXT DEFAULT 'manual' CHECK (source_type IN ('xbotgo', 'manual', 'stream_archive')),
  source_device_id TEXT,

  -- Video principal
  video_url TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  resolution TEXT DEFAULT '1080p',
  file_size_bytes BIGINT,

  -- Estado de procesamiento
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploading', 'processing', 'ready', 'failed')),
  processing_progress INTEGER DEFAULT 0,
  error_message TEXT,

  -- AI Analysis
  ai_analyzed BOOLEAN DEFAULT FALSE,
  highlights_generated BOOLEAN DEFAULT FALSE,
  transcript TEXT,

  -- Visibilidad y monetización
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted', 'premium')),
  is_premium BOOLEAN DEFAULT FALSE,
  price_cents INTEGER,

  -- Estadísticas
  views_count INTEGER DEFAULT 0,
  unique_viewers INTEGER DEFAULT 0,
  total_watch_time_seconds BIGINT DEFAULT 0,
  avg_watch_percentage DECIMAL DEFAULT 0,
  likes_count INTEGER DEFAULT 0,

  -- Timestamps
  recorded_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para match_recordings
CREATE INDEX idx_recordings_match ON match_recordings(match_id);
CREATE INDEX idx_recordings_league ON match_recordings(league_id);
CREATE INDEX idx_recordings_tournament ON match_recordings(tournament_id);
CREATE INDEX idx_recordings_status ON match_recordings(status);
CREATE INDEX idx_recordings_visibility ON match_recordings(visibility) WHERE visibility = 'public';
CREATE INDEX idx_recordings_created_at ON match_recordings(created_at DESC);
CREATE INDEX idx_recordings_views ON match_recordings(views_count DESC);
CREATE INDEX idx_recordings_mux_asset ON match_recordings(mux_asset_id) WHERE mux_asset_id IS NOT NULL;

-- ============================================
-- 2. CLIPS Y HIGHLIGHTS
-- ============================================
CREATE TABLE video_clips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recording_id UUID REFERENCES match_recordings(id) ON DELETE CASCADE,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,

  -- Tipo de clip
  clip_type TEXT CHECK (clip_type IN ('goal', 'save', 'yellow_card', 'red_card', 'penalty', 'highlight', 'custom', 'ai_generated')),

  -- Video
  clip_url TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  thumbnail_url TEXT,

  -- Timestamps en el video original
  start_time_seconds DECIMAL NOT NULL,
  end_time_seconds DECIMAL NOT NULL,
  duration_seconds DECIMAL GENERATED ALWAYS AS (end_time_seconds - start_time_seconds) STORED,

  -- Metadata
  title TEXT NOT NULL,
  description TEXT,
  match_minute INTEGER,

  -- Relaciones
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,

  -- AI
  ai_generated BOOLEAN DEFAULT FALSE,
  ai_confidence DECIMAL,
  ai_tags TEXT[],

  -- Estadísticas
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,

  -- Featured
  is_featured BOOLEAN DEFAULT FALSE,
  featured_order INTEGER,

  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para video_clips
CREATE INDEX idx_clips_recording ON video_clips(recording_id);
CREATE INDEX idx_clips_match ON video_clips(match_id);
CREATE INDEX idx_clips_league ON video_clips(league_id);
CREATE INDEX idx_clips_type ON video_clips(clip_type);
CREATE INDEX idx_clips_player ON video_clips(player_id);
CREATE INDEX idx_clips_team ON video_clips(team_id);
CREATE INDEX idx_clips_featured ON video_clips(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_clips_views ON video_clips(views_count DESC);
CREATE INDEX idx_clips_created_at ON video_clips(created_at DESC);

-- ============================================
-- 3. LIVE STREAMS
-- ============================================
CREATE TABLE live_streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  league_id UUID REFERENCES leagues(id) ON DELETE SET NULL,

  -- Mux Live
  mux_live_stream_id TEXT UNIQUE,
  mux_stream_key TEXT,
  mux_playback_id TEXT,

  -- Grabación resultante
  recording_id UUID REFERENCES match_recordings(id) ON DELETE SET NULL,
  recording_asset_id TEXT,
  recording_playback_id TEXT,
  recording_duration DECIMAL,
  recording_ready BOOLEAN DEFAULT FALSE,

  -- Info
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,

  -- Estado
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'connecting', 'live', 'ended', 'failed')),

  -- Fuente
  source_type TEXT DEFAULT 'xbotgo' CHECK (source_type IN ('xbotgo', 'obs', 'mobile', 'web')),

  -- Monetización
  is_pay_per_view BOOLEAN DEFAULT FALSE,
  price_cents INTEGER,

  -- Stats en vivo
  peak_viewers INTEGER DEFAULT 0,
  current_viewers INTEGER DEFAULT 0,
  total_unique_viewers INTEGER DEFAULT 0,

  -- Timestamps
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  broadcaster_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para live_streams
CREATE INDEX idx_streams_match ON live_streams(match_id);
CREATE INDEX idx_streams_league ON live_streams(league_id);
CREATE INDEX idx_streams_status ON live_streams(status);
CREATE INDEX idx_streams_scheduled ON live_streams(scheduled_start);
CREATE INDEX idx_streams_mux_id ON live_streams(mux_live_stream_id) WHERE mux_live_stream_id IS NOT NULL;

-- ============================================
-- 4. CHAT DE STREAMS
-- ============================================
CREATE TABLE stream_chat (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,

  message TEXT NOT NULL,

  -- Tipo de mensaje
  message_type TEXT DEFAULT 'user' CHECK (message_type IN ('user', 'ai_commentator', 'system', 'highlight')),

  -- Moderación
  is_pinned BOOLEAN DEFAULT FALSE,
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para stream_chat
CREATE INDEX idx_chat_stream ON stream_chat(stream_id);
CREATE INDEX idx_chat_created ON stream_chat(created_at);
CREATE INDEX idx_chat_user ON stream_chat(user_id);

-- ============================================
-- 5. SEGUIMIENTOS (Fans siguiendo equipos/jugadores)
-- ============================================
CREATE TABLE user_follows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Puede seguir liga, equipo o jugador
  entity_type TEXT NOT NULL CHECK (entity_type IN ('league', 'team', 'player')),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,

  notifications_enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para asegurar que solo una entidad está seteada
  CONSTRAINT follows_single_entity CHECK (
    (entity_type = 'league' AND league_id IS NOT NULL AND team_id IS NULL AND player_id IS NULL) OR
    (entity_type = 'team' AND team_id IS NOT NULL AND league_id IS NULL AND player_id IS NULL) OR
    (entity_type = 'player' AND player_id IS NOT NULL AND league_id IS NULL AND team_id IS NULL)
  ),

  -- Único por usuario y entidad
  CONSTRAINT follows_unique_entity UNIQUE (user_id, entity_type, league_id, team_id, player_id)
);

-- Índices para user_follows
CREATE INDEX idx_follows_user ON user_follows(user_id);
CREATE INDEX idx_follows_league ON user_follows(league_id) WHERE league_id IS NOT NULL;
CREATE INDEX idx_follows_team ON user_follows(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_follows_player ON user_follows(player_id) WHERE player_id IS NOT NULL;

-- ============================================
-- 6. HISTORIAL DE VISUALIZACIÓN
-- ============================================
CREATE TABLE watch_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Tipo de contenido visto
  content_type TEXT NOT NULL CHECK (content_type IN ('recording', 'clip', 'stream')),
  recording_id UUID REFERENCES match_recordings(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES video_clips(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES live_streams(id) ON DELETE CASCADE,

  -- Progreso
  watch_duration_seconds INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  watch_percentage DECIMAL DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_watched_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraint para asegurar que solo un tipo de contenido está seteado
  CONSTRAINT history_single_content CHECK (
    (content_type = 'recording' AND recording_id IS NOT NULL AND clip_id IS NULL AND stream_id IS NULL) OR
    (content_type = 'clip' AND clip_id IS NOT NULL AND recording_id IS NULL AND stream_id IS NULL) OR
    (content_type = 'stream' AND stream_id IS NOT NULL AND recording_id IS NULL AND clip_id IS NULL)
  )
);

-- Índices para watch_history
CREATE INDEX idx_history_user ON watch_history(user_id);
CREATE INDEX idx_history_recording ON watch_history(recording_id) WHERE recording_id IS NOT NULL;
CREATE INDEX idx_history_clip ON watch_history(clip_id) WHERE clip_id IS NOT NULL;
CREATE INDEX idx_history_stream ON watch_history(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_history_last_watched ON watch_history(last_watched_at DESC);

-- ============================================
-- 7. REACCIONES (Likes, etc)
-- ============================================
CREATE TABLE content_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  content_type TEXT NOT NULL CHECK (content_type IN ('recording', 'clip')),
  recording_id UUID REFERENCES match_recordings(id) ON DELETE CASCADE,
  clip_id UUID REFERENCES video_clips(id) ON DELETE CASCADE,

  reaction_type TEXT DEFAULT 'like' CHECK (reaction_type IN ('like', 'fire', 'goal', 'save', 'wow')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Único por usuario y contenido
  CONSTRAINT reactions_unique UNIQUE (user_id, recording_id, clip_id),

  -- Constraint para asegurar que solo un tipo está seteado
  CONSTRAINT reactions_single_content CHECK (
    (content_type = 'recording' AND recording_id IS NOT NULL AND clip_id IS NULL) OR
    (content_type = 'clip' AND clip_id IS NOT NULL AND recording_id IS NULL)
  )
);

-- Índices para content_reactions
CREATE INDEX idx_reactions_user ON content_reactions(user_id);
CREATE INDEX idx_reactions_recording ON content_reactions(recording_id) WHERE recording_id IS NOT NULL;
CREATE INDEX idx_reactions_clip ON content_reactions(clip_id) WHERE clip_id IS NOT NULL;

-- ============================================
-- 8. ACCESOS PPV COMPRADOS
-- ============================================
CREATE TABLE stream_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stream_id UUID REFERENCES live_streams(id) ON DELETE SET NULL,
  recording_id UUID REFERENCES match_recordings(id) ON DELETE SET NULL,

  -- Pago
  payment_provider TEXT CHECK (payment_provider IN ('stripe', 'mercadopago')),
  payment_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'MXN',

  -- Acceso
  access_granted_at TIMESTAMPTZ DEFAULT NOW(),
  access_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para stream_purchases
CREATE INDEX idx_purchases_user ON stream_purchases(user_id);
CREATE INDEX idx_purchases_stream ON stream_purchases(stream_id) WHERE stream_id IS NOT NULL;
CREATE INDEX idx_purchases_recording ON stream_purchases(recording_id) WHERE recording_id IS NOT NULL;

-- ============================================
-- TRIGGERS para updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_match_recordings_updated_at
  BEFORE UPDATE ON match_recordings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE match_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_purchases ENABLE ROW LEVEL SECURITY;

-- Videos públicos son visibles para todos
CREATE POLICY "Public recordings are viewable by everyone"
  ON match_recordings FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- Admins pueden hacer todo con recordings
CREATE POLICY "Admins can manage recordings"
  ON match_recordings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'league_admin')
    )
  );

-- Clips públicos son visibles
CREATE POLICY "Public clips are viewable by everyone"
  ON video_clips FOR SELECT
  USING (TRUE);

-- Admins pueden manejar clips
CREATE POLICY "Admins can manage clips"
  ON video_clips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'league_admin')
    )
  );

-- Streams son visibles para todos
CREATE POLICY "Streams are viewable by everyone"
  ON live_streams FOR SELECT
  USING (TRUE);

-- Admins pueden manejar streams
CREATE POLICY "Admins can manage streams"
  ON live_streams FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'league_admin')
    )
  );

-- Chat es visible para todos
CREATE POLICY "Chat is viewable by everyone"
  ON stream_chat FOR SELECT
  USING (TRUE);

-- Usuarios autenticados pueden escribir en chat
CREATE POLICY "Authenticated users can send messages"
  ON stream_chat FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Follows: usuarios manejan los suyos
CREATE POLICY "Users can manage their follows"
  ON user_follows FOR ALL
  USING (user_id = auth.uid());

-- Watch history: usuarios manejan el suyo
CREATE POLICY "Users can manage their watch history"
  ON watch_history FOR ALL
  USING (user_id = auth.uid());

-- Reactions: usuarios manejan las suyas
CREATE POLICY "Users can manage their reactions"
  ON content_reactions FOR ALL
  USING (user_id = auth.uid());

-- Purchases: usuarios ven las suyas
CREATE POLICY "Users can view their purchases"
  ON stream_purchases FOR SELECT
  USING (user_id = auth.uid());

-- Admins pueden ver todas las purchases
CREATE POLICY "Admins can view all purchases"
  ON stream_purchases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('super_admin', 'league_admin')
    )
  );

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE stream_chat;
ALTER PUBLICATION supabase_realtime ADD TABLE live_streams;

-- ============================================
-- Comentarios de documentación
-- ============================================
COMMENT ON TABLE match_recordings IS 'Videos completos de partidos grabados';
COMMENT ON TABLE video_clips IS 'Clips cortos extraídos de grabaciones (goles, highlights)';
COMMENT ON TABLE live_streams IS 'Transmisiones en vivo de partidos';
COMMENT ON TABLE stream_chat IS 'Mensajes de chat durante streams en vivo';
COMMENT ON TABLE user_follows IS 'Seguimientos de usuarios a ligas, equipos o jugadores';
COMMENT ON TABLE watch_history IS 'Historial de visualización de usuarios';
COMMENT ON TABLE content_reactions IS 'Reacciones de usuarios a videos y clips';
COMMENT ON TABLE stream_purchases IS 'Compras de acceso a contenido PPV';
