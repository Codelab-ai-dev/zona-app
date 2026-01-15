-- =====================================================
-- ZONA-GOL OS: FINANCE MODULE
-- Migration: 20260115000001_create_finance_module.sql
-- Description: Creates modular finance system with
--              feature flags, per-league configuration,
--              and automatic fine generation
-- =====================================================

-- =====================================================
-- PART 1: UPDATE LEAGUES TABLE WITH FINANCE FEATURES
-- =====================================================

-- Add finance-related feature flags to existing leagues
-- This updates the JSONB features column
DO $$
BEGIN
  -- Update leagues that have features column but missing finance flags
  UPDATE leagues
  SET features = COALESCE(features, '{}'::jsonb) || jsonb_build_object(
    'finance', false,
    'finance_auto_fines', false,
    'finance_payments', false
  )
  WHERE features IS NULL
     OR NOT (features ? 'finance');

  RAISE NOTICE 'Updated leagues with finance feature flags';
END $$;

-- =====================================================
-- PART 2: CREATE ENUMS FOR FINANCE TRANSACTIONS
-- =====================================================

-- Transaction types enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finance_transaction_type') THEN
    CREATE TYPE finance_transaction_type AS ENUM (
      -- Cuotas de inscripción
      'team_registration',      -- Inscripción de equipo
      'player_registration',    -- Inscripción de jugador

      -- Multas por tarjetas
      'yellow_card_fine',       -- Tarjeta amarilla
      'red_card_fine',          -- Tarjeta roja directa
      'double_yellow_fine',     -- Doble amarilla (expulsión)

      -- Otras multas
      'absence_fine',           -- Incomparecencia
      'late_arrival_fine',      -- Llegada tarde
      'misconduct_fine',        -- Mala conducta
      'uniform_violation_fine', -- Violación de uniforme

      -- Costos operativos
      'referee_fee',            -- Pago de árbitro
      'field_rental',           -- Renta de cancha
      'equipment_fee',          -- Equipo/materiales

      -- Pagos y ajustes
      'payment_received',       -- Pago recibido
      'partial_payment',        -- Pago parcial
      'refund',                 -- Devolución
      'discount',               -- Descuento aplicado
      'adjustment',             -- Ajuste manual

      -- Otros
      'other_income',           -- Otro ingreso
      'other_expense',          -- Otro gasto
      'sponsorship',            -- Patrocinio
      'prize_money'             -- Premio/bonificación
    );
    RAISE NOTICE 'Created finance_transaction_type enum';
  END IF;
END $$;

-- Transaction status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finance_transaction_status') THEN
    CREATE TYPE finance_transaction_status AS ENUM (
      'pending',    -- Pendiente de pago
      'paid',       -- Pagado completamente
      'partial',    -- Pago parcial
      'overdue',    -- Vencido
      'cancelled',  -- Cancelado
      'waived'      -- Condonado/perdonado
    );
    RAISE NOTICE 'Created finance_transaction_status enum';
  END IF;
END $$;

-- Payment method enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'finance_payment_method') THEN
    CREATE TYPE finance_payment_method AS ENUM (
      'cash',           -- Efectivo
      'bank_transfer',  -- Transferencia bancaria
      'card',           -- Tarjeta (en persona)
      'mercadopago',    -- MercadoPago online
      'stripe',         -- Stripe online
      'paypal',         -- PayPal
      'oxxo',           -- OXXO (México)
      'spei',           -- SPEI (México)
      'other'           -- Otro método
    );
    RAISE NOTICE 'Created finance_payment_method enum';
  END IF;
END $$;

-- =====================================================
-- PART 3: FINANCE CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS finance_config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,

  -- Nombre de configuración (opcional, para múltiples configs por torneo)
  name TEXT DEFAULT 'default',

  -- =====================
  -- CUOTAS DE INSCRIPCIÓN
  -- =====================
  team_registration_fee DECIMAL(10, 2) DEFAULT 0 CHECK (team_registration_fee >= 0),
  player_registration_fee DECIMAL(10, 2) DEFAULT 0 CHECK (player_registration_fee >= 0),
  late_registration_surcharge DECIMAL(10, 2) DEFAULT 0 CHECK (late_registration_surcharge >= 0),

  -- =====================
  -- MULTAS POR TARJETAS
  -- =====================
  yellow_card_fine DECIMAL(10, 2) DEFAULT 50 CHECK (yellow_card_fine >= 0),
  red_card_fine DECIMAL(10, 2) DEFAULT 150 CHECK (red_card_fine >= 0),
  double_yellow_fine DECIMAL(10, 2) DEFAULT 100 CHECK (double_yellow_fine >= 0),

  -- =====================
  -- OTRAS MULTAS
  -- =====================
  absence_fine DECIMAL(10, 2) DEFAULT 500 CHECK (absence_fine >= 0),
  late_arrival_fine DECIMAL(10, 2) DEFAULT 100 CHECK (late_arrival_fine >= 0),
  misconduct_fine DECIMAL(10, 2) DEFAULT 200 CHECK (misconduct_fine >= 0),
  uniform_violation_fine DECIMAL(10, 2) DEFAULT 100 CHECK (uniform_violation_fine >= 0),

  -- =====================
  -- COSTOS POR PARTIDO
  -- =====================
  referee_fee_per_match DECIMAL(10, 2) DEFAULT 300 CHECK (referee_fee_per_match >= 0),
  assistant_referee_fee DECIMAL(10, 2) DEFAULT 150 CHECK (assistant_referee_fee >= 0),
  field_rental_per_match DECIMAL(10, 2) DEFAULT 0 CHECK (field_rental_per_match >= 0),

  -- =====================
  -- CONFIGURACIÓN GENERAL
  -- =====================
  currency TEXT DEFAULT 'MXN' CHECK (currency IN ('MXN', 'USD', 'EUR', 'COP', 'ARS', 'CLP', 'PEN')),

  -- Días para vencimiento de pagos
  payment_due_days INTEGER DEFAULT 7 CHECK (payment_due_days >= 0 AND payment_due_days <= 90),

  -- Configuración de automatización
  auto_generate_fines BOOLEAN DEFAULT true,
  auto_generate_referee_fees BOOLEAN DEFAULT false,
  notify_on_new_charge BOOLEAN DEFAULT true,
  notify_on_overdue BOOLEAN DEFAULT true,

  -- Días antes de marcar como vencido
  overdue_grace_days INTEGER DEFAULT 3 CHECK (overdue_grace_days >= 0),

  -- Notas/instrucciones de pago
  payment_instructions TEXT,
  bank_account_info TEXT,

  -- Estado
  is_active BOOLEAN DEFAULT true,

  -- Auditoría
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraint: Una config por liga (sin torneo) o por liga+torneo
  UNIQUE NULLS NOT DISTINCT (league_id, tournament_id)
);

COMMENT ON TABLE finance_config IS 'Configuración de tarifas y multas por liga/torneo';
COMMENT ON COLUMN finance_config.auto_generate_fines IS 'Si true, genera multas automáticamente al registrar tarjetas';
COMMENT ON COLUMN finance_config.payment_due_days IS 'Días después de la fecha de cargo para el vencimiento';

-- =====================================================
-- PART 4: FINANCE TRANSACTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,

  -- =====================
  -- RELACIONES
  -- =====================
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  match_id UUID REFERENCES matches(id) ON DELETE SET NULL,

  -- =====================
  -- DATOS DE LA TRANSACCIÓN
  -- =====================
  transaction_type finance_transaction_type NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,

  -- Montos
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  amount_paid DECIMAL(10, 2) DEFAULT 0 CHECK (amount_paid >= 0),

  -- Tipo: true = ingreso (pago recibido), false = cargo (deuda)
  is_income BOOLEAN NOT NULL,

  -- =====================
  -- FECHAS Y ESTADO
  -- =====================
  transaction_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  status finance_transaction_status DEFAULT 'pending',

  -- =====================
  -- INFORMACIÓN DE PAGO
  -- =====================
  payment_method finance_payment_method,
  payment_reference TEXT,
  receipt_number TEXT,

  -- Para integraciones con pasarelas de pago
  external_payment_id TEXT,
  external_payment_status TEXT,
  external_payment_data JSONB,

  -- =====================
  -- TRAZABILIDAD
  -- =====================
  -- Si fue generado automáticamente
  auto_generated BOOLEAN DEFAULT false,
  -- Referencia a la estadística que lo generó (si aplica)
  source_stat_id UUID,
  -- Referencia a transacción padre (para pagos parciales)
  parent_transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,

  -- =====================
  -- AUDITORÍA
  -- =====================
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  cancelled_by UUID REFERENCES users(id),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- =====================
  -- CONSTRAINTS
  -- =====================
  -- amount_paid no puede ser mayor que amount
  CONSTRAINT valid_paid_amount CHECK (amount_paid <= amount),
  -- Si está pagado, debe tener fecha de pago
  CONSTRAINT paid_requires_date CHECK (
    (status != 'paid' AND status != 'partial') OR paid_at IS NOT NULL
  )
);

COMMENT ON TABLE finance_transactions IS 'Transacciones financieras: cargos, pagos, multas, etc.';
COMMENT ON COLUMN finance_transactions.is_income IS 'true = dinero entrante (pago), false = dinero saliente o cargo';
COMMENT ON COLUMN finance_transactions.auto_generated IS 'true si fue creado automáticamente por el sistema';

-- =====================================================
-- PART 5: INDEXES FOR PERFORMANCE
-- =====================================================

-- Índices para finance_config
CREATE INDEX IF NOT EXISTS idx_finance_config_league
  ON finance_config(league_id);
CREATE INDEX IF NOT EXISTS idx_finance_config_tournament
  ON finance_config(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_config_active
  ON finance_config(league_id) WHERE is_active = true;

-- Índices para finance_transactions
CREATE INDEX IF NOT EXISTS idx_finance_tx_league
  ON finance_transactions(league_id);
CREATE INDEX IF NOT EXISTS idx_finance_tx_tournament
  ON finance_transactions(tournament_id) WHERE tournament_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_team
  ON finance_transactions(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_player
  ON finance_transactions(player_id) WHERE player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_match
  ON finance_transactions(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_finance_tx_status
  ON finance_transactions(status);
CREATE INDEX IF NOT EXISTS idx_finance_tx_type
  ON finance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_finance_tx_due_date
  ON finance_transactions(due_date) WHERE status IN ('pending', 'partial');
CREATE INDEX IF NOT EXISTS idx_finance_tx_created
  ON finance_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_tx_auto_generated
  ON finance_transactions(source_stat_id) WHERE auto_generated = true;

-- Índice compuesto para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_finance_tx_league_status_date
  ON finance_transactions(league_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_team_status
  ON finance_transactions(team_id, status) WHERE team_id IS NOT NULL;

-- =====================================================
-- PART 6: ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE finance_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;

-- Política: Solo acceder si la liga tiene finance activo
-- Para finance_config
DROP POLICY IF EXISTS "finance_config_access_policy" ON finance_config;
CREATE POLICY "finance_config_access_policy" ON finance_config
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = finance_config.league_id
    AND (l.features->>'finance')::boolean = true
  )
);

-- Para finance_transactions
DROP POLICY IF EXISTS "finance_transactions_access_policy" ON finance_transactions;
CREATE POLICY "finance_transactions_access_policy" ON finance_transactions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = finance_transactions.league_id
    AND (l.features->>'finance')::boolean = true
  )
);

-- =====================================================
-- PART 7: VIEW - TEAM BALANCES
-- =====================================================

CREATE OR REPLACE VIEW finance_team_balances AS
SELECT
  t.id AS team_id,
  t.name AS team_name,
  t.slug AS team_slug,
  t.logo AS team_logo,
  t.league_id,
  l.name AS league_name,
  t.tournament_id,

  -- Total de cargos (lo que deben)
  COALESCE(SUM(
    CASE WHEN NOT ft.is_income AND ft.status != 'cancelled' AND ft.status != 'waived'
    THEN ft.amount ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_charges,

  -- Total pagado
  COALESCE(SUM(
    CASE WHEN ft.is_income AND ft.status != 'cancelled'
    THEN ft.amount ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_paid,

  -- Balance (negativo = deuda, positivo = saldo a favor)
  COALESCE(SUM(
    CASE
      WHEN ft.is_income AND ft.status != 'cancelled' THEN ft.amount
      WHEN NOT ft.is_income AND ft.status != 'cancelled' AND ft.status != 'waived' THEN -ft.amount
      ELSE 0
    END
  ), 0)::DECIMAL(10,2) AS balance,

  -- Deuda pendiente (cargos no pagados)
  COALESCE(SUM(
    CASE WHEN NOT ft.is_income
         AND ft.status IN ('pending', 'partial', 'overdue')
    THEN (ft.amount - ft.amount_paid) ELSE 0 END
  ), 0)::DECIMAL(10,2) AS pending_balance,

  -- Cantidad de transacciones vencidas
  COUNT(
    CASE WHEN ft.status = 'overdue' THEN 1 END
  )::INTEGER AS overdue_count,

  -- Cantidad de multas pendientes
  COUNT(
    CASE WHEN ft.transaction_type IN ('yellow_card_fine', 'red_card_fine', 'double_yellow_fine', 'absence_fine')
         AND ft.status IN ('pending', 'partial', 'overdue')
    THEN 1 END
  )::INTEGER AS pending_fines_count,

  -- Última transacción
  MAX(ft.created_at) AS last_transaction_at

FROM teams t
JOIN leagues l ON l.id = t.league_id
LEFT JOIN finance_transactions ft ON ft.team_id = t.id
WHERE (l.features->>'finance')::boolean = true
GROUP BY t.id, t.name, t.slug, t.logo, t.league_id, l.name, t.tournament_id;

COMMENT ON VIEW finance_team_balances IS 'Vista agregada del balance financiero por equipo';

-- =====================================================
-- PART 8: VIEW - LEAGUE FINANCIAL SUMMARY
-- =====================================================

CREATE OR REPLACE VIEW finance_league_summary AS
SELECT
  l.id AS league_id,
  l.name AS league_name,
  l.slug AS league_slug,

  -- Total ingresos
  COALESCE(SUM(
    CASE WHEN ft.is_income AND ft.status != 'cancelled'
    THEN ft.amount ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_income,

  -- Total egresos/cargos
  COALESCE(SUM(
    CASE WHEN NOT ft.is_income AND ft.status != 'cancelled' AND ft.status != 'waived'
    THEN ft.amount ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_charges,

  -- Total cobrado (de los cargos)
  COALESCE(SUM(
    CASE WHEN NOT ft.is_income AND ft.status IN ('paid', 'partial')
    THEN ft.amount_paid ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_collected,

  -- Total pendiente
  COALESCE(SUM(
    CASE WHEN NOT ft.is_income AND ft.status IN ('pending', 'partial', 'overdue')
    THEN (ft.amount - ft.amount_paid) ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_pending,

  -- Total vencido
  COALESCE(SUM(
    CASE WHEN ft.status = 'overdue'
    THEN (ft.amount - ft.amount_paid) ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_overdue,

  -- Conteos
  COUNT(DISTINCT ft.team_id)::INTEGER AS teams_with_transactions,
  COUNT(ft.id)::INTEGER AS total_transactions,
  COUNT(CASE WHEN ft.status = 'overdue' THEN 1 END)::INTEGER AS overdue_transactions,

  -- Multas
  COALESCE(SUM(
    CASE WHEN ft.transaction_type IN ('yellow_card_fine', 'red_card_fine', 'double_yellow_fine')
         AND ft.status != 'cancelled' AND ft.status != 'waived'
    THEN ft.amount ELSE 0 END
  ), 0)::DECIMAL(10,2) AS total_card_fines,

  -- Período
  MIN(ft.transaction_date) AS first_transaction_date,
  MAX(ft.transaction_date) AS last_transaction_date

FROM leagues l
LEFT JOIN finance_transactions ft ON ft.league_id = l.id
WHERE (l.features->>'finance')::boolean = true
GROUP BY l.id, l.name, l.slug;

COMMENT ON VIEW finance_league_summary IS 'Resumen financiero por liga';

-- =====================================================
-- PART 9: FUNCTION - CREATE DEFAULT CONFIG ON ENABLE
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_finance_config()
RETURNS TRIGGER AS $$
BEGIN
  -- Si se activó el feature finance y no existía antes
  IF (NEW.features->>'finance')::boolean = true
     AND (
       OLD.features IS NULL
       OR (OLD.features->>'finance')::boolean IS DISTINCT FROM true
     ) THEN

    -- Crear configuración default si no existe
    INSERT INTO finance_config (
      league_id,
      name,
      created_by
    )
    VALUES (
      NEW.id,
      'default',
      NEW.admin_id
    )
    ON CONFLICT (league_id, tournament_id) DO NOTHING;

    RAISE NOTICE 'Created default finance config for league %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para crear config al activar finance
DROP TRIGGER IF EXISTS on_finance_feature_enabled ON leagues;
CREATE TRIGGER on_finance_feature_enabled
AFTER UPDATE OF features ON leagues
FOR EACH ROW
EXECUTE FUNCTION create_default_finance_config();

-- =====================================================
-- PART 10: FUNCTION - GENERATE FINES FROM MATCH
-- =====================================================

CREATE OR REPLACE FUNCTION generate_fines_from_match(
  p_match_id UUID,
  p_created_by UUID DEFAULT NULL
)
RETURNS TABLE (
  fines_created INTEGER,
  total_amount DECIMAL(10,2),
  details JSONB
) AS $$
DECLARE
  v_league_id UUID;
  v_tournament_id UUID;
  v_config finance_config%ROWTYPE;
  v_stat RECORD;
  v_fines_created INTEGER := 0;
  v_total_amount DECIMAL(10,2) := 0;
  v_details JSONB := '[]'::jsonb;
  v_fine_id UUID;
  v_fine_amount DECIMAL(10,2);
  v_fine_type finance_transaction_type;
  v_fine_desc TEXT;
BEGIN
  -- Obtener league_id y tournament_id del match
  SELECT t.league_id, m.tournament_id
  INTO v_league_id, v_tournament_id
  FROM matches m
  JOIN tournaments t ON t.id = m.tournament_id
  WHERE m.id = p_match_id;

  IF v_league_id IS NULL THEN
    RETURN QUERY SELECT 0, 0::DECIMAL(10,2), '{"error": "Match not found"}'::jsonb;
    RETURN;
  END IF;

  -- Verificar que finance y auto_fines estén activos
  IF NOT EXISTS (
    SELECT 1 FROM leagues l
    WHERE l.id = v_league_id
    AND (l.features->>'finance')::boolean = true
    AND (l.features->>'finance_auto_fines')::boolean = true
  ) THEN
    RETURN QUERY SELECT 0, 0::DECIMAL(10,2), '{"error": "Finance or auto_fines not enabled"}'::jsonb;
    RETURN;
  END IF;

  -- Obtener configuración de tarifas (prioridad: torneo > liga)
  SELECT * INTO v_config
  FROM finance_config
  WHERE league_id = v_league_id
    AND (tournament_id = v_tournament_id OR tournament_id IS NULL)
    AND is_active = true
  ORDER BY tournament_id NULLS LAST
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN QUERY SELECT 0, 0::DECIMAL(10,2), '{"error": "No finance config found"}'::jsonb;
    RETURN;
  END IF;

  -- Iterar sobre estadísticas del partido con tarjetas
  FOR v_stat IN
    SELECT
      ps.id as stat_id,
      ps.player_id,
      ps.yellow_cards,
      ps.red_cards,
      p.name as player_name,
      p.team_id,
      t.name as team_name
    FROM player_stats ps
    JOIN players p ON p.id = ps.player_id
    JOIN teams t ON t.id = p.team_id
    WHERE ps.match_id = p_match_id
      AND (ps.yellow_cards > 0 OR ps.red_cards > 0)
      -- Evitar duplicados: no generar si ya existe
      AND NOT EXISTS (
        SELECT 1 FROM finance_transactions ft
        WHERE ft.source_stat_id = ps.id
        AND ft.auto_generated = true
        AND ft.status != 'cancelled'
      )
  LOOP
    -- Determinar tipo de multa y monto
    v_fine_amount := 0;
    v_fine_type := NULL;
    v_fine_desc := NULL;

    -- Caso 1: Doble amarilla (expulsión)
    IF v_stat.yellow_cards >= 2 THEN
      v_fine_amount := v_config.double_yellow_fine;
      v_fine_type := 'double_yellow_fine';
      v_fine_desc := format('Multa por doble amarilla - %s (%s)',
                           v_stat.player_name, v_stat.team_name);

    -- Caso 2: Amarilla simple
    ELSIF v_stat.yellow_cards = 1 AND v_stat.red_cards = 0 THEN
      v_fine_amount := v_config.yellow_card_fine;
      v_fine_type := 'yellow_card_fine';
      v_fine_desc := format('Multa por tarjeta amarilla - %s (%s)',
                           v_stat.player_name, v_stat.team_name);

    -- Caso 3: Roja directa
    ELSIF v_stat.red_cards > 0 AND v_stat.yellow_cards < 2 THEN
      v_fine_amount := v_config.red_card_fine;
      v_fine_type := 'red_card_fine';
      v_fine_desc := format('Multa por tarjeta roja - %s (%s)',
                           v_stat.player_name, v_stat.team_name);
    END IF;

    -- Crear la multa si aplica
    IF v_fine_type IS NOT NULL AND v_fine_amount > 0 THEN
      INSERT INTO finance_transactions (
        league_id,
        tournament_id,
        team_id,
        player_id,
        match_id,
        transaction_type,
        description,
        amount,
        is_income,
        transaction_date,
        due_date,
        status,
        auto_generated,
        source_stat_id,
        created_by
      ) VALUES (
        v_league_id,
        v_tournament_id,
        v_stat.team_id,
        v_stat.player_id,
        p_match_id,
        v_fine_type,
        v_fine_desc,
        v_fine_amount,
        false, -- Es un cargo, no un ingreso
        CURRENT_DATE,
        CURRENT_DATE + v_config.payment_due_days,
        'pending',
        true,
        v_stat.stat_id,
        p_created_by
      )
      RETURNING id INTO v_fine_id;

      v_fines_created := v_fines_created + 1;
      v_total_amount := v_total_amount + v_fine_amount;

      -- Agregar al detalle
      v_details := v_details || jsonb_build_object(
        'id', v_fine_id,
        'type', v_fine_type,
        'player', v_stat.player_name,
        'team', v_stat.team_name,
        'amount', v_fine_amount
      );
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_fines_created, v_total_amount, v_details;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_fines_from_match IS
  'Genera automáticamente multas por tarjetas de un partido. Retorna cantidad y detalle.';

-- =====================================================
-- PART 11: FUNCTION - UPDATE OVERDUE STATUS
-- =====================================================

CREATE OR REPLACE FUNCTION update_overdue_transactions()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE finance_transactions
  SET
    status = 'overdue',
    updated_at = NOW()
  WHERE status = 'pending'
    AND due_date < CURRENT_DATE
    AND EXISTS (
      SELECT 1 FROM leagues l
      WHERE l.id = finance_transactions.league_id
      AND (l.features->>'finance')::boolean = true
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_overdue_transactions IS
  'Actualiza transacciones pendientes a vencidas si pasó la fecha. Ejecutar diariamente.';

-- =====================================================
-- PART 12: FUNCTION - REGISTER PAYMENT
-- =====================================================

CREATE OR REPLACE FUNCTION register_payment(
  p_transaction_id UUID,
  p_amount DECIMAL(10,2),
  p_payment_method finance_payment_method,
  p_payment_reference TEXT DEFAULT NULL,
  p_paid_by UUID DEFAULT NULL
)
RETURNS finance_transactions AS $$
DECLARE
  v_transaction finance_transactions%ROWTYPE;
  v_new_paid DECIMAL(10,2);
  v_new_status finance_transaction_status;
BEGIN
  -- Obtener transacción actual
  SELECT * INTO v_transaction
  FROM finance_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_transaction IS NULL THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_transaction.status IN ('paid', 'cancelled', 'waived') THEN
    RAISE EXCEPTION 'Transaction is already %', v_transaction.status;
  END IF;

  -- Calcular nuevo monto pagado
  v_new_paid := v_transaction.amount_paid + p_amount;

  -- Determinar nuevo estado
  IF v_new_paid >= v_transaction.amount THEN
    v_new_status := 'paid';
    v_new_paid := v_transaction.amount; -- No exceder el monto
  ELSE
    v_new_status := 'partial';
  END IF;

  -- Actualizar transacción
  UPDATE finance_transactions
  SET
    amount_paid = v_new_paid,
    status = v_new_status,
    payment_method = p_payment_method,
    payment_reference = COALESCE(p_payment_reference, payment_reference),
    paid_at = CASE WHEN v_new_status = 'paid' THEN NOW() ELSE paid_at END,
    updated_by = p_paid_by,
    updated_at = NOW()
  WHERE id = p_transaction_id
  RETURNING * INTO v_transaction;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION register_payment IS
  'Registra un pago (total o parcial) para una transacción.';

-- =====================================================
-- PART 13: TRIGGER - AUTO UPDATE TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_finance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS finance_config_updated ON finance_config;
CREATE TRIGGER finance_config_updated
BEFORE UPDATE ON finance_config
FOR EACH ROW
EXECUTE FUNCTION update_finance_timestamp();

DROP TRIGGER IF EXISTS finance_transactions_updated ON finance_transactions;
CREATE TRIGGER finance_transactions_updated
BEFORE UPDATE ON finance_transactions
FOR EACH ROW
EXECUTE FUNCTION update_finance_timestamp();

-- =====================================================
-- PART 14: HELPER FUNCTION - CHECK FINANCE ENABLED
-- =====================================================

CREATE OR REPLACE FUNCTION league_has_finance(p_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id
    AND (features->>'finance')::boolean = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION league_has_auto_fines(p_league_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id
    AND (features->>'finance')::boolean = true
    AND (features->>'finance_auto_fines')::boolean = true
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- PART 15: GRANTS (adjust based on your setup)
-- =====================================================

-- Grant access to authenticated users (adjust role name if different)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON finance_config TO authenticated;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON finance_transactions TO authenticated;
-- GRANT SELECT ON finance_team_balances TO authenticated;
-- GRANT SELECT ON finance_league_summary TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Finance module migration completed successfully!';
  RAISE NOTICE '   - Created finance_transaction_type enum';
  RAISE NOTICE '   - Created finance_transaction_status enum';
  RAISE NOTICE '   - Created finance_payment_method enum';
  RAISE NOTICE '   - Created finance_config table';
  RAISE NOTICE '   - Created finance_transactions table';
  RAISE NOTICE '   - Created finance_team_balances view';
  RAISE NOTICE '   - Created finance_league_summary view';
  RAISE NOTICE '   - Created helper functions and triggers';
  RAISE NOTICE '   - Enabled RLS policies';
END $$;
