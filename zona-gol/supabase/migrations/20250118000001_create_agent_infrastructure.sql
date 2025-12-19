-- =====================================================
-- AGENT SERVICE INFRASTRUCTURE
-- =====================================================
-- Tablas para soportar el Agent Service profesional
-- Incluye: identidad, permisos, conversaciones, acciones
-- =====================================================

-- 1. Tabla de vínculos WhatsApp → Usuario → Liga
CREATE TABLE IF NOT EXISTS whatsapp_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'league_admin', 'team_owner', 'user')),
  is_active BOOLEAN DEFAULT true,
  linked_at TIMESTAMPTZ DEFAULT now(),
  last_interaction_at TIMESTAMPTZ,

  -- Metadata adicional
  display_name TEXT,
  preferred_language TEXT DEFAULT 'es',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsqueda rápida
CREATE INDEX idx_whatsapp_links_phone ON whatsapp_user_links(phone_number) WHERE is_active = true;
CREATE INDEX idx_whatsapp_links_user ON whatsapp_user_links(user_id);
CREATE INDEX idx_whatsapp_links_league ON whatsapp_user_links(league_id);

-- 2. Tabla de conversaciones (auditoría completa)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'web', 'mobile')),
  user_identifier TEXT NOT NULL, -- phone o user_id
  whatsapp_link_id UUID REFERENCES whatsapp_user_links(id),

  -- Contexto multi-tenant
  league_id UUID REFERENCES public.leagues(id),
  tournament_id UUID REFERENCES public.tournaments(id),

  -- Mensaje del usuario
  user_message TEXT NOT NULL,

  -- Respuesta del agente
  agent_response TEXT,
  agent_response_tokens INTEGER,

  -- Contexto RAG usado
  rag_chunks_used JSONB, -- Array de {id, score, content_type, content_text}
  rag_search_query TEXT, -- Query de embedding usada
  rag_similarity_threshold REAL,

  -- Consultas SQL ejecutadas (si aplica)
  sql_queries_executed JSONB, -- Array de {query, result_count}

  -- Intención detectada
  intent TEXT, -- calendario, resultados, tabla, etc.
  intent_confidence REAL,

  -- Acciones generadas
  actions JSONB, -- Array de {type, payload, executed}

  -- Metadata de performance
  latency_ms INTEGER,
  llm_model TEXT,
  llm_cost_usd REAL,

  -- Control de calidad
  user_feedback TEXT CHECK (user_feedback IN ('positive', 'negative', 'neutral')),
  escalated_to_human BOOLEAN DEFAULT false,

  -- Metadata de envío
  delivery_status TEXT CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
  delivery_error TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para analytics
CREATE INDEX idx_conversations_channel ON agent_conversations(channel);
CREATE INDEX idx_conversations_league ON agent_conversations(league_id);
CREATE INDEX idx_conversations_intent ON agent_conversations(intent);
CREATE INDEX idx_conversations_created ON agent_conversations(created_at DESC);
CREATE INDEX idx_conversations_user ON agent_conversations(user_identifier);

-- 3. Tabla de rate limiting
CREATE TABLE IF NOT EXISTS agent_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  message_count INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para búsqueda rápida de ventanas activas
CREATE INDEX idx_rate_limits_user_window ON agent_rate_limits(user_identifier, window_end);

-- 4. Tabla de acciones del agente
CREATE TABLE IF NOT EXISTS agent_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE CASCADE,

  -- Tipo de acción
  action_type TEXT NOT NULL CHECK (action_type IN (
    'show_match', 'show_jornada', 'show_standings', 'show_team',
    'request_reschedule', 'escalate_to_human', 'send_reminder',
    'generate_report', 'custom'
  )),

  -- Payload de la acción
  payload JSONB NOT NULL,

  -- Ejecución
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'executed', 'failed')),
  executed_at TIMESTAMPTZ,
  execution_result JSONB,
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_actions_conversation ON agent_actions(conversation_id);
CREATE INDEX idx_actions_type ON agent_actions(action_type);
CREATE INDEX idx_actions_status ON agent_actions(status) WHERE status = 'pending';

-- 5. Tabla de plantillas de respuesta (WhatsApp 24h window)
CREATE TABLE IF NOT EXISTS whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificación
  template_name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL CHECK (category IN ('utility', 'marketing', 'authentication')),

  -- Contenido de la plantilla
  language TEXT DEFAULT 'es',
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,

  -- Variables dinámicas
  variables JSONB, -- Array de {name, example, required}

  -- Estado de aprobación Meta/Twilio
  approval_status TEXT DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_at TIMESTAMPTZ,

  -- Uso
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Tabla de ventanas de conversación WhatsApp (24h tracking)
CREATE TABLE IF NOT EXISTS whatsapp_conversation_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,

  -- Ventana de 24 horas
  window_opened_at TIMESTAMPTZ NOT NULL,
  window_closes_at TIMESTAMPTZ NOT NULL,

  -- Origen de la ventana
  opened_by TEXT CHECK (opened_by IN ('user_message', 'business_message', 'template')),

  -- Estado
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversation_windows_phone ON whatsapp_conversation_windows(phone_number, is_active);
CREATE INDEX idx_conversation_windows_active ON whatsapp_conversation_windows(window_closes_at)
  WHERE is_active = true;

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para verificar si usuario está dentro de ventana 24h
CREATE OR REPLACE FUNCTION is_within_24h_window(p_phone_number TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_conversation_windows
    WHERE phone_number = p_phone_number
      AND is_active = true
      AND window_closes_at > now()
  );
END;
$$ LANGUAGE plpgsql;

-- Función para abrir nueva ventana 24h
CREATE OR REPLACE FUNCTION open_24h_window(
  p_phone_number TEXT,
  p_opened_by TEXT DEFAULT 'user_message'
)
RETURNS UUID AS $$
DECLARE
  v_window_id UUID;
BEGIN
  -- Cerrar ventanas anteriores
  UPDATE whatsapp_conversation_windows
  SET is_active = false
  WHERE phone_number = p_phone_number
    AND is_active = true;

  -- Crear nueva ventana
  INSERT INTO whatsapp_conversation_windows (
    phone_number,
    window_opened_at,
    window_closes_at,
    opened_by,
    is_active
  ) VALUES (
    p_phone_number,
    now(),
    now() + interval '24 hours',
    p_opened_by,
    true
  )
  RETURNING id INTO v_window_id;

  RETURN v_window_id;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar y aplicar rate limiting
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_identifier TEXT,
  p_max_messages INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
BEGIN
  v_window_start := now();
  v_window_end := now() + (p_window_minutes || ' minutes')::interval;

  -- Buscar ventana activa
  SELECT message_count INTO v_current_count
  FROM agent_rate_limits
  WHERE user_identifier = p_user_identifier
    AND window_end > now()
  ORDER BY window_end DESC
  LIMIT 1;

  -- Si no hay ventana activa, crear una
  IF v_current_count IS NULL THEN
    INSERT INTO agent_rate_limits (
      user_identifier,
      window_start,
      window_end,
      message_count
    ) VALUES (
      p_user_identifier,
      v_window_start,
      v_window_end,
      1
    );
    RETURN true;
  END IF;

  -- Si está dentro del límite, incrementar contador
  IF v_current_count < p_max_messages THEN
    UPDATE agent_rate_limits
    SET message_count = message_count + 1,
        updated_at = now()
    WHERE user_identifier = p_user_identifier
      AND window_end > now();
    RETURN true;
  END IF;

  -- Excedió el límite
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del agente
CREATE OR REPLACE FUNCTION get_agent_stats(
  p_league_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT now() - interval '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE(
  total_conversations BIGINT,
  avg_latency_ms NUMERIC,
  total_cost_usd NUMERIC,
  intents JSONB,
  channels JSONB,
  feedback JSONB,
  escalations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_conversations,
    ROUND(AVG(latency_ms)::numeric, 2) as avg_latency_ms,
    ROUND(SUM(COALESCE(llm_cost_usd, 0))::numeric, 4) as total_cost_usd,

    -- Distribución de intenciones
    jsonb_object_agg(
      COALESCE(intent, 'unknown'),
      intent_count
    ) FILTER (WHERE intent IS NOT NULL) as intents,

    -- Distribución de canales
    jsonb_object_agg(
      channel,
      channel_count
    ) as channels,

    -- Feedback de usuarios
    jsonb_object_agg(
      COALESCE(user_feedback, 'no_feedback'),
      feedback_count
    ) FILTER (WHERE user_feedback IS NOT NULL) as feedback,

    -- Escalaciones
    SUM(CASE WHEN escalated_to_human THEN 1 ELSE 0 END)::BIGINT as escalations

  FROM (
    SELECT
      ac.*,
      COUNT(*) OVER (PARTITION BY intent) as intent_count,
      COUNT(*) OVER (PARTITION BY channel) as channel_count,
      COUNT(*) OVER (PARTITION BY user_feedback) as feedback_count
    FROM agent_conversations ac
    WHERE
      (p_league_id IS NULL OR ac.league_id = p_league_id)
      AND ac.created_at BETWEEN p_start_date AND p_end_date
  ) subquery;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger para actualizar last_interaction_at en whatsapp_user_links
CREATE OR REPLACE FUNCTION update_whatsapp_last_interaction()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE whatsapp_user_links
  SET last_interaction_at = now()
  WHERE phone_number = NEW.user_identifier
    AND is_active = true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_whatsapp_interaction
  AFTER INSERT ON agent_conversations
  FOR EACH ROW
  WHEN (NEW.channel = 'whatsapp')
  EXECUTE FUNCTION update_whatsapp_last_interaction();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Habilitar RLS
ALTER TABLE whatsapp_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;

-- Policies para whatsapp_user_links
CREATE POLICY "Super admins can view all WhatsApp links"
  ON whatsapp_user_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view their own WhatsApp links"
  ON whatsapp_user_links FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "League admins can view links in their league"
  ON whatsapp_user_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (
        role = 'super_admin' OR
        (role = 'league_admin' AND league_id = whatsapp_user_links.league_id)
      )
    )
  );

-- Policies para agent_conversations (solo lectura para admins)
CREATE POLICY "Admins can view conversations in their context"
  ON agent_conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND (
        role = 'super_admin' OR
        (role = 'league_admin' AND league_id = agent_conversations.league_id)
      )
    )
  );

-- Policies para templates (solo super_admin puede modificar)
CREATE POLICY "Everyone can view active templates"
  ON whatsapp_message_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Super admins can manage templates"
  ON whatsapp_message_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
  );

-- =====================================================
-- COMENTARIOS
-- =====================================================

COMMENT ON TABLE whatsapp_user_links IS 'Vínculos entre números de WhatsApp y usuarios del sistema con contexto de liga';
COMMENT ON TABLE agent_conversations IS 'Auditoría completa de todas las conversaciones con el agente de IA';
COMMENT ON TABLE agent_rate_limits IS 'Control de rate limiting por usuario para proteger costos';
COMMENT ON TABLE agent_actions IS 'Acciones estructuradas generadas por el agente';
COMMENT ON TABLE whatsapp_message_templates IS 'Plantillas de WhatsApp aprobadas por Meta para uso fuera de ventana 24h';
COMMENT ON TABLE whatsapp_conversation_windows IS 'Seguimiento de ventanas de conversación de 24 horas de WhatsApp';

COMMENT ON FUNCTION is_within_24h_window IS 'Verifica si un número de teléfono está dentro de una ventana de conversación activa';
COMMENT ON FUNCTION open_24h_window IS 'Abre una nueva ventana de conversación de 24 horas';
COMMENT ON FUNCTION check_rate_limit IS 'Verifica y aplica rate limiting para proteger contra abuso';
COMMENT ON FUNCTION get_agent_stats IS 'Obtiene estadísticas del agente para analytics';
