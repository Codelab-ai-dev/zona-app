--
-- PostgreSQL database dump
--

\restrict utkhCBUwLRI1bRLXFIJul5W1q8zIgng6X4xGgiZY9823PjgA1lh8OXZNdSaNFs3

-- Dumped from database version 16.15 (Debian 16.15-1.pgdg12+2)
-- Dumped by pg_dump version 16.15 (Debian 16.15-1.pgdg12+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: card_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.card_type AS ENUM (
    'yellow',
    'red'
);


--
-- Name: finance_payment_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.finance_payment_method AS ENUM (
    'cash',
    'bank_transfer',
    'card',
    'mercadopago',
    'stripe',
    'paypal',
    'oxxo',
    'spei',
    'other'
);


--
-- Name: finance_transaction_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.finance_transaction_status AS ENUM (
    'pending',
    'paid',
    'partial',
    'overdue',
    'cancelled',
    'waived'
);


--
-- Name: finance_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.finance_transaction_type AS ENUM (
    'team_registration',
    'player_registration',
    'yellow_card_fine',
    'red_card_fine',
    'double_yellow_fine',
    'absence_fine',
    'late_arrival_fine',
    'misconduct_fine',
    'uniform_violation_fine',
    'referee_fee',
    'field_rental',
    'equipment_fee',
    'payment_received',
    'partial_payment',
    'refund',
    'discount',
    'adjustment',
    'other_income',
    'other_expense',
    'sponsorship',
    'prize_money'
);


--
-- Name: goal_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_type AS ENUM (
    'normal',
    'penalty',
    'own_goal',
    'free_kick'
);


--
-- Name: match_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.match_status AS ENUM (
    'scheduled',
    'in_progress',
    'finished',
    'cancelled'
);


--
-- Name: recognition_mode; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.recognition_mode AS ENUM (
    'quick',
    'verified'
);


--
-- Name: suspension_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.suspension_status AS ENUM (
    'active',
    'completed',
    'cancelled'
);


--
-- Name: suspension_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.suspension_type AS ENUM (
    'red_card',
    'yellow_accumulation',
    'disciplinary_committee',
    'other'
);


--
-- Name: sync_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sync_status AS ENUM (
    'synced',
    'pending',
    'failed'
);


--
-- Name: user_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_role AS ENUM (
    'super_admin',
    'league_admin',
    'team_owner',
    'public'
);


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$ SELECT current_setting('request.jwt.claim.role', true) $$;


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;


--
-- Name: auto_update_jornada_on_match_change(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_update_jornada_on_match_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_league_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Get league and tournament IDs
  SELECT t.league_id, t.id
  INTO v_league_id, v_tournament_id
  FROM tournaments t
  WHERE t.id = COALESCE(NEW.tournament_id, OLD.tournament_id);

  -- Update jornada if round exists
  IF COALESCE(NEW.round, OLD.round) IS NOT NULL THEN
    PERFORM insert_jornada_to_knowledge_base(
      v_league_id,
      v_tournament_id,
      COALESCE(NEW.round, OLD.round)
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: auto_update_knowledge_base_on_match_finish(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_update_knowledge_base_on_match_finish() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_match_content TEXT;
  v_league_id UUID;
  v_tournament_id UUID;
BEGIN
  -- Only process if match status changed to 'finished'
  IF NEW.status = 'finished' AND (OLD.status IS NULL OR OLD.status != 'finished') THEN

    -- Get league_id and tournament_id from the match
    SELECT t.league_id, t.id
    INTO v_league_id, v_tournament_id
    FROM tournaments t
    WHERE t.id = NEW.tournament_id;

    -- Generate match result content
    v_match_content := generate_match_result_content(NEW.id);

    -- Only insert if content was generated successfully
    IF v_match_content IS NOT NULL AND LENGTH(v_match_content) > 0 THEN
      -- Insert into knowledge base
      INSERT INTO league_knowledge_base (
        league_id,
        tournament_id,
        match_id,
        content_type,
        content_text,
        metadata,
        is_auto_generated,
        valid_from
      ) VALUES (
        v_league_id,
        v_tournament_id,
        NEW.id,
        'resultado_partido',
        v_match_content,
        jsonb_build_object(
          'match_id', NEW.id,
          'home_team_id', NEW.home_team_id,
          'away_team_id', NEW.away_team_id,
          'home_score', NEW.home_score,
          'away_score', NEW.away_score,
          'match_date', NEW.match_date,
          'finalized_at', NEW.updated_at
        ),
        true,
        NEW.match_date
      );

      RAISE NOTICE 'Knowledge base entry created for match %', NEW.id;
    END IF;

    -- Also refresh the league's general knowledge (standings, results, etc.)
    -- This ensures the AI has up-to-date information about the league
    PERFORM refresh_league_knowledge(v_league_id, v_tournament_id);

    RAISE NOTICE 'League knowledge refreshed for league % and tournament %', v_league_id, v_tournament_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: check_rate_limit(text, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_rate_limit(p_user_identifier text, p_max_messages integer DEFAULT 10, p_window_minutes integer DEFAULT 10) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: check_user_setup(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_user_setup() RETURNS TABLE(auth_users_count bigint, public_users_count bigint, profiles_accessible boolean)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM public.users),
    (SELECT COUNT(*) FROM public.profiles) IS NOT NULL
  INTO auth_users_count, public_users_count, profiles_accessible;
  
  RETURN NEXT;
END;
$$;


--
-- Name: check_yellow_card_accumulation(uuid, uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_yellow_card_accumulation(p_player_id uuid, p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid, p_yellow_limit integer DEFAULT 5) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_yellow_count INTEGER;
  v_existing_suspension UUID;
  v_team_id UUID;
BEGIN
  -- Count yellow cards for this player in the league/tournament
  SELECT COUNT(*)
  INTO v_yellow_count
  FROM match_cards mc
  JOIN matches m ON mc.match_id = m.id
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE mc.player_id = p_player_id
    AND mc.card_type = 'yellow'
    AND t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id);

  -- Check if player already has an active yellow accumulation suspension
  SELECT id INTO v_existing_suspension
  FROM player_suspensions
  WHERE player_id = p_player_id
    AND league_id = p_league_id
    AND suspension_type = 'yellow_accumulation'
    AND status = 'active'
  LIMIT 1;

  -- If accumulated enough cards and no existing suspension, create one
  IF v_yellow_count >= p_yellow_limit AND v_existing_suspension IS NULL THEN
    -- Get player's team
    SELECT team_id INTO v_team_id
    FROM players
    WHERE id = p_player_id;

    INSERT INTO player_suspensions (
      player_id,
      team_id,
      league_id,
      tournament_id,
      suspension_type,
      reason,
      matches_to_serve
    )
    VALUES (
      p_player_id,
      v_team_id,
      p_league_id,
      p_tournament_id,
      'yellow_accumulation',
      format('Acumulación de %s tarjetas amarillas', v_yellow_count),
      1
    );

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


--
-- Name: clean_expired_knowledge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.clean_expired_knowledge() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: create_default_finance_config(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_default_finance_config() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: create_suspension_for_red_card(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_suspension_for_red_card() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only create suspension for red cards
  IF NEW.card_type = 'red' THEN
    -- Get league_id from the match
    INSERT INTO player_suspensions (
      player_id,
      team_id,
      league_id,
      tournament_id,
      suspension_type,
      reason,
      matches_to_serve,
      match_card_id,
      match_id
    )
    SELECT
      NEW.player_id,
      NEW.team_id,
      t.league_id,
      m.tournament_id,
      'red_card',
      COALESCE(NEW.reason, 'Tarjeta roja directa'),
      1, -- Default: 1 match suspension
      NEW.id,
      NEW.match_id
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.id = NEW.match_id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: create_user_admin(text, text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_user_admin(p_email text, p_password text, p_name text, p_role text, p_phone text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Create the user in auth.users
  v_user_id := (SELECT extensions.uuid_generate_v4());
  
  INSERT INTO auth.users (
    id, 
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    is_super_admin
  ) VALUES (
    v_user_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'name', p_name,
      'role', p_role,
      'phone', p_phone
    ),
    now(),
    now(),
    '',
    false
  );
  
  -- Create the user in public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    phone,
    is_active
  ) VALUES (
    v_user_id,
    p_email,
    p_name,
    p_role,
    p_phone,
    true
  );
  
  -- Return the user ID
  v_result := jsonb_build_object(
    'id', v_user_id,
    'email', p_email,
    'name', p_name,
    'role', p_role
  );
  
  RETURN v_result;
END;
$$;


--
-- Name: generate_fines_from_match(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_fines_from_match(p_match_id uuid, p_created_by uuid DEFAULT NULL::uuid) RETURNS TABLE(fines_created integer, total_amount numeric, details jsonb)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: generate_jornada_calendar(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_jornada_calendar(p_league_id uuid, p_tournament_id uuid, p_round integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_league_name TEXT;
  v_tournament_name TEXT;
  v_match_count INTEGER := 0;
BEGIN
  -- Get league and tournament names
  SELECT l.name, t.name
  INTO v_league_name, v_tournament_name
  FROM leagues l
  LEFT JOIN tournaments t ON t.id = p_tournament_id
  WHERE l.id = p_league_id;

  -- Build header
  v_content := format(
    E'📅 JORNADA %s\n\n' ||
    E'🏆 Liga: %s\n' ||
    E'🏅 Torneo: %s\n\n' ||
    E'CALENDARIO DE PARTIDOS:\n' ||
    E'%s\n',
    p_round,
    v_league_name,
    COALESCE(v_tournament_name, 'Todos los torneos'),
    REPEAT('-', 60)
  );

  -- Get matches for this round
  FOR v_match IN
    SELECT
      m.id,
      m.match_date,
      m.match_time,
      m.field_number,
      TO_CHAR(m.match_date, 'DD/MM/YYYY') as fecha,
      TO_CHAR(m.match_date, 'Day') as dia_semana,
      COALESCE(TO_CHAR(m.match_time, 'HH24:MI'),
               TO_CHAR(m.match_date, 'HH24:MI')) as hora,
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
    AND m.round = p_round
    ORDER BY m.match_date, m.match_time NULLS LAST, m.field_number NULLS LAST
  LOOP
    v_match_count := v_match_count + 1;

    -- Add match info
    v_content := v_content || format(
      E'\n📍 %s, %s - %s',
      TRIM(v_match.dia_semana),
      v_match.fecha,
      v_match.hora
    );

    -- Add field number if available
    IF v_match.field_number IS NOT NULL THEN
      v_content := v_content || format(' | Cancha %s', v_match.field_number);
    END IF;

    v_content := v_content || E'\n';

    -- Add teams
    v_content := v_content || format(
      E'   %s  vs  %s',
      v_match.equipo_local,
      v_match.equipo_visitante
    );

    -- Add score if match is finished or in progress
    IF v_match.status = 'finished' THEN
      v_content := v_content || format(
        E'\n   ✅ Finalizado: %s - %s',
        v_match.home_score,
        v_match.away_score
      );
    ELSIF v_match.status = 'in_progress' THEN
      v_content := v_content || format(
        E'\n   ⚽ EN VIVO: %s - %s',
        v_match.home_score,
        v_match.away_score
      );
    ELSIF v_match.status = 'cancelled' THEN
      v_content := v_content || E'\n   ❌ Cancelado';
    END IF;

    v_content := v_content || E'\n';
  END LOOP;

  -- If no matches found
  IF v_match_count = 0 THEN
    v_content := v_content || E'\nNo hay partidos programados para esta jornada.\n';
  ELSE
    v_content := v_content || format(E'\n%s\nTotal de partidos: %s\n', REPEAT('-', 60), v_match_count);
  END IF;

  RETURN v_content;
END;
$$;


--
-- Name: generate_jornada_content(uuid, uuid, date, date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_jornada_content(p_league_id uuid, p_tournament_id uuid, p_start_date date DEFAULT CURRENT_DATE, p_end_date date DEFAULT (CURRENT_DATE + '7 days'::interval)) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: generate_match_result_content(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_match_result_content(p_match_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_content TEXT;
  v_match RECORD;
  v_observations TEXT;
  v_winner TEXT;
  v_result_type TEXT;
  v_player RECORD;
  v_home_goalscorers TEXT := '';
  v_away_goalscorers TEXT := '';
  v_home_red_cards TEXT := '';
  v_away_red_cards TEXT := '';
  v_home_yellow_cards TEXT := '';
  v_away_yellow_cards TEXT := '';
  v_has_home_goals BOOLEAN := false;
  v_has_away_goals BOOLEAN := false;
  v_has_home_red BOOLEAN := false;
  v_has_away_red BOOLEAN := false;
  v_has_home_yellow BOOLEAN := false;
  v_has_away_yellow BOOLEAN := false;
BEGIN
  -- Get match details with all related information
  SELECT
    m.id,
    m.match_date,
    m.match_time,
    m.field_number,
    m.home_score,
    m.away_score,
    m.home_team_id,
    m.away_team_id,
    m.round,
    ht.name as home_team_name,
    at.name as away_team_name,
    t.name as tournament_name,
    t.league_id,
    l.name as league_name,
    m.phase,
    m.playoff_round,
    m.status
  INTO v_match
  FROM matches m
  JOIN teams ht ON m.home_team_id = ht.id
  JOIN teams at ON m.away_team_id = at.id
  JOIN tournaments t ON m.tournament_id = t.id
  JOIN leagues l ON t.league_id = l.id
  WHERE m.id = p_match_id
  AND m.status = 'finished';

  -- If match not found or not finished, return empty
  IF NOT FOUND THEN
    RETURN '';
  END IF;

  -- Get referee observations if available
  SELECT general_observations
  INTO v_observations
  FROM match_referee_reports
  WHERE match_id = p_match_id;

  -- Determine winner and result type
  IF v_match.home_score > v_match.away_score THEN
    v_winner := v_match.home_team_name;
    v_result_type := 'Victoria Local';
  ELSIF v_match.away_score > v_match.home_score THEN
    v_winner := v_match.away_team_name;
    v_result_type := 'Victoria Visitante';
  ELSE
    v_winner := 'Empate';
    v_result_type := 'Empate';
  END IF;

  -- Build main content header
  v_content := format(
    E'⚽ RESULTADO DEL PARTIDO\n\n' ||
    E'🏆 Liga: %s\n' ||
    E'🏅 Torneo: %s\n',
    v_match.league_name,
    COALESCE(v_match.tournament_name, 'Torneo')
  );

  -- Add Round/Jornada if available
  IF v_match.round IS NOT NULL THEN
    v_content := v_content || format(E'📅 Jornada: %s\n', v_match.round);
  END IF;

  -- Add date and time
  v_content := v_content || format(
    E'📆 Fecha: %s',
    TO_CHAR(v_match.match_date, 'DD/MM/YYYY HH24:MI')
  );

  -- Add field number if available
  IF v_match.field_number IS NOT NULL THEN
    v_content := v_content || format(E' | Cancha: %s', v_match.field_number);
  END IF;

  v_content := v_content || E'\n\n';

  -- Add final score
  v_content := v_content || format(
    E'RESULTADO FINAL:\n' ||
    E'%s  %s - %s  %s\n\n' ||
    E'%s: %s\n',
    v_match.home_team_name,
    v_match.home_score,
    v_match.away_score,
    v_match.away_team_name,
    v_result_type,
    v_winner
  );

  -- ========================================================================
  -- GOALSCORERS
  -- ========================================================================

  -- Get goalscorers for home team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals,
      ps.assists
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_home_goals := true;
    IF v_player.goals = 1 THEN
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s)',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_home_goalscorers := v_home_goalscorers || format(
        E'  • %s (#%s) - %s goles',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.goals
      );
    END IF;

    -- Add assists if available
    IF v_player.assists IS NOT NULL AND v_player.assists > 0 THEN
      v_home_goalscorers := v_home_goalscorers || format(' + %s asistencia(s)', v_player.assists);
    END IF;

    v_home_goalscorers := v_home_goalscorers || E'\n';
  END LOOP;

  -- Get goalscorers for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.goals,
      ps.assists
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.goals > 0
    ORDER BY ps.goals DESC, p.name
  LOOP
    v_has_away_goals := true;
    IF v_player.goals = 1 THEN
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s)',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_away_goalscorers := v_away_goalscorers || format(
        E'  • %s (#%s) - %s goles',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.goals
      );
    END IF;

    -- Add assists if available
    IF v_player.assists IS NOT NULL AND v_player.assists > 0 THEN
      v_away_goalscorers := v_away_goalscorers || format(' + %s asistencia(s)', v_player.assists);
    END IF;

    v_away_goalscorers := v_away_goalscorers || E'\n';
  END LOOP;

  -- Add goalscorers section if there are any goals
  IF v_has_home_goals OR v_has_away_goals THEN
    v_content := v_content || E'\n⚽ GOLEADORES:\n';

    IF v_has_home_goals THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_goalscorers);
    END IF;

    IF v_has_away_goals THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_goalscorers);
    END IF;
  END IF;

  -- ========================================================================
  -- RED CARDS (EXPULSIONS)
  -- ========================================================================

  -- Get red cards for home team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.red_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.red_cards > 0
    ORDER BY p.name
  LOOP
    v_has_home_red := true;
    v_home_red_cards := v_home_red_cards || format(
      E'  • %s (#%s)\n',
      v_player.player_name,
      COALESCE(v_player.jersey_number::TEXT, 'S/N')
    );
  END LOOP;

  -- Get red cards for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.red_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.red_cards > 0
    ORDER BY p.name
  LOOP
    v_has_away_red := true;
    v_away_red_cards := v_away_red_cards || format(
      E'  • %s (#%s)\n',
      v_player.player_name,
      COALESCE(v_player.jersey_number::TEXT, 'S/N')
    );
  END LOOP;

  -- Add red cards section if there are any
  IF v_has_home_red OR v_has_away_red THEN
    v_content := v_content || E'\n🟥 TARJETAS ROJAS (EXPULSADOS):\n';

    IF v_has_home_red THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_red_cards);
    END IF;

    IF v_has_away_red THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_red_cards);
    END IF;
  END IF;

  -- ========================================================================
  -- YELLOW CARDS
  -- ========================================================================

  -- Get yellow cards for home team (only if > 1 to avoid clutter)
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.yellow_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.home_team_id
    AND ps.yellow_cards > 0
    ORDER BY ps.yellow_cards DESC, p.name
  LOOP
    v_has_home_yellow := true;
    IF v_player.yellow_cards = 1 THEN
      v_home_yellow_cards := v_home_yellow_cards || format(
        E'  • %s (#%s)\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_home_yellow_cards := v_home_yellow_cards || format(
        E'  • %s (#%s) - %s tarjetas\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.yellow_cards
      );
    END IF;
  END LOOP;

  -- Get yellow cards for away team
  FOR v_player IN
    SELECT
      p.name as player_name,
      p.jersey_number,
      ps.yellow_cards
    FROM player_stats ps
    JOIN players p ON ps.player_id = p.id
    WHERE ps.match_id = p_match_id
    AND p.team_id = v_match.away_team_id
    AND ps.yellow_cards > 0
    ORDER BY ps.yellow_cards DESC, p.name
  LOOP
    v_has_away_yellow := true;
    IF v_player.yellow_cards = 1 THEN
      v_away_yellow_cards := v_away_yellow_cards || format(
        E'  • %s (#%s)\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N')
      );
    ELSE
      v_away_yellow_cards := v_away_yellow_cards || format(
        E'  • %s (#%s) - %s tarjetas\n',
        v_player.player_name,
        COALESCE(v_player.jersey_number::TEXT, 'S/N'),
        v_player.yellow_cards
      );
    END IF;
  END LOOP;

  -- Add yellow cards section if there are any
  IF v_has_home_yellow OR v_has_away_yellow THEN
    v_content := v_content || E'\n🟨 TARJETAS AMARILLAS:\n';

    IF v_has_home_yellow THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.home_team_name, v_home_yellow_cards);
    END IF;

    IF v_has_away_yellow THEN
      v_content := v_content || format(E'\n%s:\n%s', v_match.away_team_name, v_away_yellow_cards);
    END IF;
  END IF;

  -- ========================================================================
  -- ADDITIONAL INFO
  -- ========================================================================

  -- Add phase info if playoff match
  IF v_match.phase IS NOT NULL THEN
    v_content := v_content || format(
      E'\n\n📊 Fase: %s',
      CASE v_match.phase
        WHEN 'group' THEN 'Fase de Grupos'
        WHEN 'playoff' THEN format('Playoff - %s', COALESCE(v_match.playoff_round, 'Ronda'))
        ELSE v_match.phase
      END
    );
  END IF;

  -- Add referee observations if available
  IF v_observations IS NOT NULL AND LENGTH(TRIM(v_observations)) > 0 THEN
    v_content := v_content || format(
      E'\n\n📋 OBSERVACIONES DEL ÁRBITRO:\n%s',
      v_observations
    );
  END IF;

  RETURN v_content;
END;
$$;


--
-- Name: generate_results_content(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_results_content(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid, p_limit integer DEFAULT 10) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: generate_standings_content(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_standings_content(p_league_id uuid, p_tournament_id uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: generate_suspensions_content(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_suspensions_content(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS text
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_agent_stats(uuid, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_agent_stats(p_league_id uuid DEFAULT NULL::uuid, p_start_date timestamp with time zone DEFAULT (now() - '30 days'::interval), p_end_date timestamp with time zone DEFAULT now()) RETURNS TABLE(total_conversations bigint, avg_latency_ms numeric, total_cost_usd numeric, intents jsonb, channels jsonb, feedback jsonb, escalations bigint)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_current_jornada(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_current_jornada(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_current_round INTEGER;
BEGIN
  -- Get the round of the next scheduled or in-progress match
  SELECT m.round INTO v_current_round
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE t.league_id = p_league_id
  AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  AND m.status IN ('scheduled', 'in_progress')
  AND m.round IS NOT NULL
  ORDER BY m.match_date, m.round
  LIMIT 1;

  -- If no upcoming matches, return the last finished round
  IF v_current_round IS NULL THEN
    SELECT MAX(m.round) INTO v_current_round
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.status = 'finished'
    AND m.round IS NOT NULL;
  END IF;

  RETURN v_current_round;
END;
$$;


--
-- Name: get_discipline_by_league(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_discipline_by_league(p_league_id uuid, p_limit integer DEFAULT 20) RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text, team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint, yellow_cards bigint, red_cards bigint, minutes_played bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  WHERE t.league_id = p_league_id
    AND t.is_active = true
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  HAVING (COALESCE(SUM(ps.yellow_cards), 0) + COALESCE(SUM(ps.red_cards), 0)) > 0
  ORDER BY (COALESCE(SUM(ps.yellow_cards), 0) + COALESCE(SUM(ps.red_cards), 0) * 3) DESC,
           COALESCE(SUM(ps.yellow_cards), 0) DESC
  LIMIT p_limit;
$$;


--
-- Name: get_knowledge_base_stats(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_knowledge_base_stats(p_league_id uuid) RETURNS TABLE(content_type text, total_items integer, with_embeddings integer, avg_content_length double precision)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: get_stats_by_team(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_stats_by_team(p_team_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text, team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint, yellow_cards bigint, red_cards bigint, minutes_played bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  LEFT JOIN matches m ON ps.match_id = m.id
  WHERE p.team_id = p_team_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  ORDER BY goals DESC, assists DESC;
$$;


--
-- Name: get_top_scorers_by_league(uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_top_scorers_by_league(p_league_id uuid, p_limit integer DEFAULT 20) RETURNS TABLE(player_id uuid, player_name text, jersey_number integer, "position" text, photo text, team_id uuid, team_name text, matches_played bigint, goals bigint, assists bigint, yellow_cards bigint, red_cards bigint, minutes_played bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    p.id AS player_id,
    p.name AS player_name,
    p.jersey_number,
    p.position,
    p.photo,
    p.team_id,
    t.name AS team_name,
    COUNT(ps.id) AS matches_played,
    COALESCE(SUM(ps.goals), 0) AS goals,
    COALESCE(SUM(ps.assists), 0) AS assists,
    COALESCE(SUM(ps.yellow_cards), 0) AS yellow_cards,
    COALESCE(SUM(ps.red_cards), 0) AS red_cards,
    COALESCE(SUM(ps.minutes_played), 0) AS minutes_played
  FROM player_stats ps
  JOIN players p ON ps.player_id = p.id
  JOIN teams t ON p.team_id = t.id
  WHERE t.league_id = p_league_id
    AND t.is_active = true
  GROUP BY p.id, p.name, p.jersey_number, p.position, p.photo, p.team_id, t.name
  HAVING COALESCE(SUM(ps.goals), 0) > 0
  ORDER BY goals DESC, assists DESC
  LIMIT p_limit;
$$;


--
-- Name: get_tournament_standings(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_tournament_standings(tournament_id_param uuid) RETURNS TABLE(team_position integer, team_id uuid, team_name text, team_logo text, matches_played integer, matches_won integer, matches_drawn integer, matches_lost integer, goals_for integer, goals_against integer, goal_difference integer, points integer, recent_form text, last_match_date timestamp with time zone)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as team_position,
    ts.team_id,
    t.name as team_name,
    t.logo as team_logo,
    ts.matches_played,
    ts.matches_won,
    ts.matches_drawn,
    ts.matches_lost,
    ts.goals_for,
    ts.goals_against,
    ts.goal_difference,
    ts.points,
    ts.recent_form,
    ts.last_match_date
  FROM team_stats ts
  JOIN teams t ON ts.team_id = t.id
  WHERE ts.tournament_id = tournament_id_param
  ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert into users table with better error handling
  INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email, 
    'public', 
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name',
      users.name
    ),
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: handle_user_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_user_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.users SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;


--
-- Name: insert_jornada_to_knowledge_base(uuid, uuid, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.insert_jornada_to_knowledge_base(p_league_id uuid, p_tournament_id uuid, p_round integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_content TEXT;
  v_earliest_match_date TIMESTAMP WITH TIME ZONE;
  v_latest_match_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Generate calendar content
  v_content := generate_jornada_calendar(p_league_id, p_tournament_id, p_round);

  -- Get date range for this jornada
  SELECT
    MIN(m.match_date),
    MAX(m.match_date)
  INTO v_earliest_match_date, v_latest_match_date
  FROM matches m
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE t.league_id = p_league_id
  AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
  AND m.round = p_round;

  -- Delete existing entry for this jornada if exists
  DELETE FROM league_knowledge_base
  WHERE league_id = p_league_id
  AND (p_tournament_id IS NULL OR tournament_id = p_tournament_id)
  AND content_type = 'jornada'
  AND metadata->>'round' = p_round::TEXT;

  -- Insert new entry
  INSERT INTO league_knowledge_base (
    league_id,
    tournament_id,
    content_type,
    content_text,
    metadata,
    is_auto_generated,
    valid_from,
    valid_until,
    created_at,
    updated_at
  ) VALUES (
    p_league_id,
    p_tournament_id,
    'jornada',
    v_content,
    jsonb_build_object(
      'round', p_round,
      'earliest_match', v_earliest_match_date,
      'latest_match', v_latest_match_date,
      'type', 'jornada_calendar'
    ),
    true,
    v_earliest_match_date,
    v_latest_match_date + INTERVAL '7 days', -- Valid for 7 days after last match
    NOW(),
    NOW()
  );

  RAISE NOTICE 'Jornada % insertada en knowledge base', p_round;
  RETURN TRUE;

EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error insertando jornada %: %', p_round, SQLERRM;
  RETURN FALSE;
END;
$$;


--
-- Name: is_player_suspended(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_player_suspended(p_player_id uuid, p_match_id uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_active_suspensions INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_active_suspensions
  FROM player_suspensions ps
  JOIN matches m ON m.id = p_match_id
  JOIN tournaments t ON m.tournament_id = t.id
  WHERE ps.player_id = p_player_id
    AND ps.league_id = t.league_id
    AND ps.status = 'active'
    AND ps.matches_served < ps.matches_to_serve;

  RETURN v_active_suspensions > 0;
END;
$$;


--
-- Name: is_within_24h_window(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_within_24h_window(p_phone_number text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM whatsapp_conversation_windows
    WHERE phone_number = p_phone_number
      AND is_active = true
      AND window_closes_at > now()
  );
END;
$$;


--
-- Name: league_has_auto_fines(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.league_has_auto_fines(p_league_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id
    AND (features->>'finance')::boolean = true
    AND (features->>'finance_auto_fines')::boolean = true
  );
END;
$$;


--
-- Name: league_has_feature(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.league_has_feature(p_league_id uuid, p_feature_name text) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  v_has_feature BOOLEAN;
BEGIN
  SELECT (features->>p_feature_name)::BOOLEAN
  INTO v_has_feature
  FROM leagues
  WHERE id = p_league_id;

  RETURN COALESCE(v_has_feature, false);
END;
$$;


--
-- Name: league_has_finance(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.league_has_finance(p_league_id uuid) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM leagues
    WHERE id = p_league_id
    AND (features->>'finance')::boolean = true
  );
END;
$$;


--
-- Name: match_league_knowledge(public.vector, double precision, integer, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.match_league_knowledge(query_embedding public.vector, match_threshold double precision DEFAULT 0.7, match_count integer DEFAULT 5, filter_league_id uuid DEFAULT NULL::uuid, filter_tournament_id uuid DEFAULT NULL::uuid) RETURNS TABLE(id uuid, content text, content_type text, metadata jsonb, league_id uuid, tournament_id uuid, match_id uuid, distance double precision)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: migrate_player_stats_to_cedula_tables(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.migrate_player_stats_to_cedula_tables() RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    stat_record RECORD;
    goal_minute INTEGER;
    card_minute INTEGER;
    goal_counter INTEGER;
    card_counter INTEGER;
BEGIN
    RAISE NOTICE 'Iniciando migración de player_stats a tablas de cédula arbitral...';

    -- Recorrer todas las estadísticas de jugadores que tienen goles o tarjetas
    FOR stat_record IN
        SELECT
            ps.player_id,
            ps.match_id,
            ps.goals,
            ps.assists,
            ps.yellow_cards,
            ps.red_cards,
            p.name as player_name,
            p.jersey_number,
            p.team_id,
            m.match_date
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN matches m ON ps.match_id = m.id
        WHERE ps.goals > 0 OR ps.yellow_cards > 0 OR ps.red_cards > 0
        ORDER BY m.match_date DESC
    LOOP
        RAISE NOTICE 'Procesando jugador: % (Match: %)', stat_record.player_name, stat_record.match_id;

        -- Migrar GOLES
        IF stat_record.goals > 0 THEN
            goal_counter := 1;
            WHILE goal_counter <= stat_record.goals LOOP
                -- Calcular minuto distribuido durante el partido
                goal_minute := 15 + (goal_counter - 1) * 25; -- Minutos 15, 40, 65, etc.

                -- Verificar si el gol ya existe
                IF NOT EXISTS (
                    SELECT 1 FROM match_goals
                    WHERE match_id = stat_record.match_id
                    AND player_id = stat_record.player_id
                    AND minute = goal_minute
                ) THEN
                    INSERT INTO match_goals (
                        match_id,
                        player_id,
                        team_id,
                        minute,
                        goal_type,
                        description,
                        created_at
                    ) VALUES (
                        stat_record.match_id,
                        stat_record.player_id,
                        stat_record.team_id,
                        goal_minute,
                        'normal',
                        format('Gol de %s (#%s) - Migrado desde estadísticas',
                               stat_record.player_name,
                               COALESCE(stat_record.jersey_number::text, '?')),
                        stat_record.match_date
                    );
                    RAISE NOTICE '  ✅ Gol creado: %s min %', stat_record.player_name, goal_minute;
                END IF;

                goal_counter := goal_counter + 1;
            END LOOP;
        END IF;

        -- Migrar TARJETAS AMARILLAS
        IF stat_record.yellow_cards > 0 THEN
            card_counter := 1;
            WHILE card_counter <= stat_record.yellow_cards LOOP
                -- Calcular minuto para tarjetas
                card_minute := 30 + (card_counter - 1) * 20; -- Minutos 30, 50, etc.

                -- Verificar si la tarjeta ya existe
                IF NOT EXISTS (
                    SELECT 1 FROM match_cards
                    WHERE match_id = stat_record.match_id
                    AND player_id = stat_record.player_id
                    AND card_type = 'yellow'
                    AND minute = card_minute
                ) THEN
                    INSERT INTO match_cards (
                        match_id,
                        player_id,
                        team_id,
                        card_type,
                        minute,
                        reason,
                        created_at
                    ) VALUES (
                        stat_record.match_id,
                        stat_record.player_id,
                        stat_record.team_id,
                        'yellow',
                        card_minute,
                        format('Tarjeta amarilla para %s (#%s) - Migrado desde estadísticas',
                               stat_record.player_name,
                               COALESCE(stat_record.jersey_number::text, '?')),
                        stat_record.match_date
                    );
                    RAISE NOTICE '  🟨 Tarjeta amarilla creada: %s min %', stat_record.player_name, card_minute;
                END IF;

                card_counter := card_counter + 1;
            END LOOP;
        END IF;

        -- Migrar TARJETAS ROJAS
        IF stat_record.red_cards > 0 THEN
            card_counter := 1;
            WHILE card_counter <= stat_record.red_cards LOOP
                -- Calcular minuto para tarjetas rojas
                card_minute := 60 + (card_counter - 1) * 15; -- Minutos 60, 75, etc.

                -- Verificar si la tarjeta ya existe
                IF NOT EXISTS (
                    SELECT 1 FROM match_cards
                    WHERE match_id = stat_record.match_id
                    AND player_id = stat_record.player_id
                    AND card_type = 'red'
                    AND minute = card_minute
                ) THEN
                    INSERT INTO match_cards (
                        match_id,
                        player_id,
                        team_id,
                        card_type,
                        minute,
                        reason,
                        created_at
                    ) VALUES (
                        stat_record.match_id,
                        stat_record.player_id,
                        stat_record.team_id,
                        'red',
                        card_minute,
                        format('Tarjeta roja para %s (#%s) - Migrado desde estadísticas',
                               stat_record.player_name,
                               COALESCE(stat_record.jersey_number::text, '?')),
                        stat_record.match_date
                    );
                    RAISE NOTICE '  🟥 Tarjeta roja creada: %s min %', stat_record.player_name, card_minute;
                END IF;

                card_counter := card_counter + 1;
            END LOOP;
        END IF;

    END LOOP;

    RAISE NOTICE 'Migración completada exitosamente.';
END;
$$;


--
-- Name: open_24h_window(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.open_24h_window(p_phone_number text, p_opened_by text DEFAULT 'user_message'::text) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: populate_all_jornadas_to_knowledge_base(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_all_jornadas_to_knowledge_base(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS TABLE(round integer, inserted boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_round INTEGER;
BEGIN
  -- Loop through all rounds that exist for this league/tournament
  FOR v_round IN
    SELECT DISTINCT m.round
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE t.league_id = p_league_id
    AND (p_tournament_id IS NULL OR m.tournament_id = p_tournament_id)
    AND m.round IS NOT NULL
    ORDER BY m.round
  LOOP
    BEGIN
      round := v_round;
      inserted := insert_jornada_to_knowledge_base(p_league_id, p_tournament_id, v_round);
      error_message := NULL;
      RETURN NEXT;
    EXCEPTION WHEN OTHERS THEN
      round := v_round;
      inserted := FALSE;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;


--
-- Name: populate_knowledge_base_with_finished_matches(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.populate_knowledge_base_with_finished_matches() RETURNS TABLE(match_id uuid, league_id uuid, tournament_id uuid, inserted boolean, error_message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_match RECORD;
  v_match_content TEXT;
  v_league_id UUID;
  v_tournament_id UUID;
  v_inserted BOOLEAN;
  v_error TEXT;
BEGIN
  -- Loop through all finished matches
  FOR v_match IN
    SELECT
      m.id,
      m.tournament_id,
      m.home_score,
      m.away_score,
      m.match_date,
      m.updated_at,
      m.home_team_id,
      m.away_team_id,
      t.league_id
    FROM matches m
    JOIN tournaments t ON m.tournament_id = t.id
    WHERE m.status = 'finished'
    ORDER BY m.match_date DESC
  LOOP
    BEGIN
      v_inserted := false;
      v_error := NULL;
      v_league_id := v_match.league_id;
      v_tournament_id := v_match.tournament_id;

      -- Check if this match already has a knowledge base entry
      IF EXISTS (
        SELECT 1
        FROM league_knowledge_base
        WHERE match_id = v_match.id
        AND content_type = 'resultado_partido'
      ) THEN
        -- Skip if already exists
        v_inserted := false;
        v_error := 'Already exists';
      ELSE
        -- Generate match result content
        v_match_content := generate_match_result_content(v_match.id);

        -- Only insert if content was generated successfully
        IF v_match_content IS NOT NULL AND LENGTH(v_match_content) > 0 THEN
          -- Insert into knowledge base
          INSERT INTO league_knowledge_base (
            league_id,
            tournament_id,
            match_id,
            content_type,
            content_text,
            metadata,
            is_auto_generated,
            valid_from,
            created_at,
            updated_at
          ) VALUES (
            v_league_id,
            v_tournament_id,
            v_match.id,
            'resultado_partido',
            v_match_content,
            jsonb_build_object(
              'match_id', v_match.id,
              'home_team_id', v_match.home_team_id,
              'away_team_id', v_match.away_team_id,
              'home_score', v_match.home_score,
              'away_score', v_match.away_score,
              'match_date', v_match.match_date,
              'finalized_at', v_match.updated_at,
              'migrated', true
            ),
            true,
            v_match.match_date,
            v_match.updated_at,  -- Use match's update time as created time
            NOW()
          );

          v_inserted := true;
          v_error := NULL;

          RAISE NOTICE 'Knowledge base entry created for match %', v_match.id;
        ELSE
          v_inserted := false;
          v_error := 'No content generated';
        END IF;
      END IF;

      -- Return result for this match
      match_id := v_match.id;
      league_id := v_league_id;
      tournament_id := v_tournament_id;
      inserted := v_inserted;
      error_message := v_error;
      RETURN NEXT;

    EXCEPTION WHEN OTHERS THEN
      -- Catch any errors and continue with next match
      match_id := v_match.id;
      league_id := v_league_id;
      tournament_id := v_tournament_id;
      inserted := false;
      error_message := SQLERRM;
      RETURN NEXT;
    END;
  END LOOP;

  RETURN;
END;
$$;


--
-- Name: rebuild_team_stats_for_tournament(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rebuild_team_stats_for_tournament(tournament_id_param uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    match_record RECORD;
BEGIN
  -- Delete existing stats for this tournament
  DELETE FROM team_stats WHERE tournament_id = tournament_id_param;
  
  -- Process each finished match to rebuild stats
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE tournament_id = tournament_id_param 
    AND status = 'finished'
    ORDER BY match_date ASC
  LOOP
    -- The trigger will handle creating/updating team stats
    UPDATE matches 
    SET updated_at = NOW()
    WHERE id = match_record.id;
  END LOOP;
  
  -- Update attendance stats for all matches in tournament
  FOR match_record IN 
    SELECT * FROM matches 
    WHERE tournament_id = tournament_id_param 
    AND status = 'finished'
  LOOP
    PERFORM update_team_attendance_for_match(match_record.id);
  END LOOP;
  
END;
$$;


--
-- Name: refresh_all_leagues_knowledge(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_all_leagues_knowledge() RETURNS TABLE(league_id uuid, items_created integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id as league_id,
    refresh_league_knowledge(l.id, NULL) as items_created
  FROM leagues l
  WHERE l.is_active = true;
END;
$$;


--
-- Name: refresh_league_knowledge(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.refresh_league_knowledge(p_league_id uuid, p_tournament_id uuid DEFAULT NULL::uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: finance_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_transactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    league_id uuid NOT NULL,
    tournament_id uuid,
    team_id uuid,
    player_id uuid,
    match_id uuid,
    transaction_type public.finance_transaction_type NOT NULL,
    description text NOT NULL,
    notes text,
    amount numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT 0,
    is_income boolean NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE,
    due_date date,
    paid_at timestamp with time zone,
    status public.finance_transaction_status DEFAULT 'pending'::public.finance_transaction_status,
    payment_method public.finance_payment_method,
    payment_reference text,
    receipt_number text,
    external_payment_id text,
    external_payment_status text,
    external_payment_data jsonb,
    auto_generated boolean DEFAULT false,
    source_stat_id uuid,
    parent_transaction_id uuid,
    created_by uuid,
    updated_by uuid,
    cancelled_by uuid,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT finance_transactions_amount_check CHECK ((amount >= (0)::numeric)),
    CONSTRAINT finance_transactions_amount_paid_check CHECK ((amount_paid >= (0)::numeric)),
    CONSTRAINT paid_requires_date CHECK ((((status <> 'paid'::public.finance_transaction_status) AND (status <> 'partial'::public.finance_transaction_status)) OR (paid_at IS NOT NULL))),
    CONSTRAINT valid_paid_amount CHECK ((amount_paid <= amount))
);


--
-- Name: register_payment(uuid, numeric, public.finance_payment_method, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.register_payment(p_transaction_id uuid, p_amount numeric, p_payment_method public.finance_payment_method, p_payment_reference text DEFAULT NULL::text, p_paid_by uuid DEFAULT NULL::uuid) RETURNS public.finance_transactions
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: search_league_knowledge(public.vector, uuid, integer, double precision); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_league_knowledge(p_query_embedding public.vector, p_league_id uuid, p_limit integer DEFAULT 5, p_similarity_threshold double precision DEFAULT 0.7) RETURNS TABLE(id uuid, content_type text, content_text text, metadata jsonb, similarity double precision)
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: set_default_features_for_mode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_default_features_for_mode() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Set features based on product_mode
  IF NEW.product_mode = 'web_only' THEN
    NEW.features := jsonb_build_object(
      'qr_codes', false,
      'facial_recognition', false,
      'mobile_app', false,
      'realtime_updates', false,
      'manual_entry', true,
      'public_portal', true,
      'statistics', true,
      'ai_agent', true
    );
  ELSIF NEW.product_mode = 'full' THEN
    NEW.features := jsonb_build_object(
      'qr_codes', true,
      'facial_recognition', true,
      'mobile_app', true,
      'realtime_updates', true,
      'manual_entry', true,
      'public_portal', true,
      'statistics', true,
      'ai_agent', true
    );
  END IF;

  -- Track mode changes
  IF TG_OP = 'UPDATE' AND OLD.product_mode IS DISTINCT FROM NEW.product_mode THEN
    NEW.mode_updated_at := NOW();
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: show_tournament_standings_detailed(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.show_tournament_standings_detailed(tournament_id_param uuid DEFAULT NULL::uuid) RETURNS TABLE(pos integer, team_name text, played integer, won integer, drawn integer, lost integer, gf integer, ga integer, gd integer, points integer, form text, last_match text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF tournament_id_param IS NULL THEN
        -- Show all tournaments if none specified
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (PARTITION BY tr.name ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as pos,
            (t.name || ' (' || tr.name || ')') as team_name,
            ts.matches_played as played,
            ts.matches_won as won,
            ts.matches_drawn as drawn,
            ts.matches_lost as lost,
            ts.goals_for as gf,
            ts.goals_against as ga,
            ts.goal_difference as gd,
            ts.points,
            COALESCE(ts.recent_form, '-') as form,
            COALESCE(ts.last_match_date::TEXT, 'No matches') as last_match
        FROM team_stats ts
        JOIN teams t ON ts.team_id = t.id
        JOIN tournaments tr ON ts.tournament_id = tr.id
        ORDER BY tr.name, ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
    ELSE
        -- Show specific tournament
        RETURN QUERY
        SELECT 
            ROW_NUMBER() OVER (ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC)::INTEGER as pos,
            t.name as team_name,
            ts.matches_played as played,
            ts.matches_won as won,
            ts.matches_drawn as drawn,
            ts.matches_lost as lost,
            ts.goals_for as gf,
            ts.goals_against as ga,
            ts.goal_difference as gd,
            ts.points,
            COALESCE(ts.recent_form, '-') as form,
            COALESCE(ts.last_match_date::TEXT, 'No matches') as last_match
        FROM team_stats ts
        JOIN teams t ON ts.team_id = t.id
        WHERE ts.tournament_id = tournament_id_param
        ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC;
    END IF;
END;
$$;


--
-- Name: sync_attendance_to_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_attendance_to_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only create player_stats if both player_id and match_id are not NULL
  IF NEW.player_id IS NOT NULL AND NEW.match_id IS NOT NULL THEN
    INSERT INTO player_stats (
      player_id, 
      match_id, 
      goals, 
      assists, 
      yellow_cards, 
      red_cards, 
      minutes_played
    )
    VALUES (
      NEW.player_id, 
      NEW.match_id, 
      0, 0, 0, 0, 0
    )
    ON CONFLICT (player_id, match_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_player_stats_to_cedula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_player_stats_to_cedula() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    goal_minute INTEGER;
    card_minute INTEGER;
    goal_counter INTEGER;
    card_counter INTEGER;
BEGIN
    -- Solo procesar si es INSERT o UPDATE con cambios en estadísticas
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (
        NEW.goals != OLD.goals OR
        NEW.yellow_cards != OLD.yellow_cards OR
        NEW.red_cards != OLD.red_cards
    )) THEN

        -- Limpiar registros previos para este jugador en este partido
        DELETE FROM match_goals
        WHERE match_id = NEW.match_id
        AND player_id = NEW.player_id
        AND description LIKE '%Migrado desde estadísticas%';

        DELETE FROM match_cards
        WHERE match_id = NEW.match_id
        AND player_id = NEW.player_id
        AND reason LIKE '%Migrado desde estadísticas%';

        -- Recrear goles
        IF NEW.goals > 0 THEN
            goal_counter := 1;
            WHILE goal_counter <= NEW.goals LOOP
                goal_minute := 15 + (goal_counter - 1) * 25;

                INSERT INTO match_goals (
                    match_id, player_id, team_id, minute, goal_type, description, created_at
                )
                SELECT
                    NEW.match_id, NEW.player_id, p.team_id, goal_minute, 'normal',
                    format('Gol de %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')),
                    NOW()
                FROM players p WHERE p.id = NEW.player_id;

                goal_counter := goal_counter + 1;
            END LOOP;
        END IF;

        -- Recrear tarjetas amarillas
        IF NEW.yellow_cards > 0 THEN
            card_counter := 1;
            WHILE card_counter <= NEW.yellow_cards LOOP
                card_minute := 30 + (card_counter - 1) * 20;

                INSERT INTO match_cards (
                    match_id, player_id, team_id, card_type, minute, reason, created_at
                )
                SELECT
                    NEW.match_id, NEW.player_id, p.team_id, 'yellow', card_minute,
                    format('Tarjeta amarilla para %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')),
                    NOW()
                FROM players p WHERE p.id = NEW.player_id;

                card_counter := card_counter + 1;
            END LOOP;
        END IF;

        -- Recrear tarjetas rojas
        IF NEW.red_cards > 0 THEN
            card_counter := 1;
            WHILE card_counter <= NEW.red_cards LOOP
                card_minute := 60 + (card_counter - 1) * 15;

                INSERT INTO match_cards (
                    match_id, player_id, team_id, card_type, minute, reason, created_at
                )
                SELECT
                    NEW.match_id, NEW.player_id, p.team_id, 'red', card_minute,
                    format('Tarjeta roja para %s (#%s) - Auto-sync', p.name, COALESCE(p.jersey_number::text, '?')),
                    NOW()
                FROM players p WHERE p.id = NEW.player_id;

                card_counter := card_counter + 1;
            END LOOP;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;


--
-- Name: sync_qr_attendance_to_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_qr_attendance_to_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only create player_stats if both player_id and match_id are not NULL
  IF NEW.player_id IS NOT NULL AND NEW.match_id IS NOT NULL THEN
    INSERT INTO player_stats (
      player_id, 
      match_id, 
      goals, 
      assists, 
      yellow_cards, 
      red_cards, 
      minutes_played
    )
    VALUES (
      NEW.player_id, 
      NEW.match_id, 
      0, 0, 0, 0, 90
    )
    ON CONFLICT (player_id, match_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: sync_qr_to_player_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_qr_to_player_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    total_assists INTEGER;
BEGIN
    -- Count total assists for this player in this match from asistencias_qr
    SELECT COUNT(*) INTO total_assists
    FROM asistencias_qr 
    WHERE player_id = NEW.player_id AND match_id = NEW.match_id;
    
    -- Insert or update player_stats with correct assist count
    INSERT INTO player_stats (
        player_id, 
        match_id, 
        goals, 
        assists, 
        yellow_cards, 
        red_cards, 
        minutes_played,
        created_at,
        updated_at
    )
    VALUES (
        NEW.player_id, 
        NEW.match_id, 
        0, -- goals
        total_assists, -- assists from asistencias_qr count
        0, -- yellow_cards
        0, -- red_cards
        90, -- minutes_played
        NOW(),
        NOW()
    )
    ON CONFLICT (player_id, match_id) 
    DO UPDATE SET
        assists = total_assists,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$;


--
-- Name: update_finance_timestamp(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_finance_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_overdue_transactions(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_overdue_transactions() RETURNS integer
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: update_player_registration_requests_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_player_registration_requests_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_team_attendance_for_match(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_attendance_for_match(match_id_param uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update team stats with attendance information for both teams in the match
  UPDATE team_stats ts
  SET 
    total_attendance = (
      SELECT COUNT(DISTINCT fa.player_id)
      FROM facial_attendance fa
      JOIN players p ON fa.player_id = p.id
      WHERE fa.match_id = match_id_param
      AND p.team_id = ts.team_id
    ),
    average_attendance = (
      SELECT 
        CASE 
          WHEN COUNT(DISTINCT m.id) > 0 THEN 
            COUNT(DISTINCT fa.player_id)::DECIMAL / COUNT(DISTINCT m.id)
          ELSE 0 
        END
      FROM matches m
      LEFT JOIN facial_attendance fa ON m.id = fa.match_id
      LEFT JOIN players p ON fa.player_id = p.id
      WHERE (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id)
      AND m.tournament_id = ts.tournament_id
      AND m.status = 'finished'
      AND (p.team_id = ts.team_id OR p.team_id IS NULL)
    ),
    updated_at = NOW()
  WHERE EXISTS (
    SELECT 1 FROM matches m
    WHERE m.id = match_id_param
    AND (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id)
    AND m.tournament_id = ts.tournament_id
  );
END;
$$;


--
-- Name: update_team_attendance_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_attendance_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update team stats with attendance information
  IF TG_OP = 'INSERT' THEN
    UPDATE team_stats ts
    SET 
      total_attendance = (
        SELECT COUNT(DISTINCT fa.player_id)
        FROM facial_attendance fa
        JOIN players p ON fa.player_id = p.id
        JOIN matches m ON fa.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      average_attendance = (
        SELECT 
          CASE 
            WHEN COUNT(DISTINCT m.id) > 0 THEN 
              COUNT(DISTINCT fa.player_id)::DECIMAL / COUNT(DISTINCT m.id)
            ELSE 0 
          END
        FROM matches m
        LEFT JOIN facial_attendance fa ON m.id = fa.match_id
        LEFT JOIN players p ON fa.player_id = p.id
        WHERE (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id)
        AND m.tournament_id = ts.tournament_id
        AND m.status = 'finished'
        AND (p.team_id = ts.team_id OR p.team_id IS NULL)
      ),
      updated_at = NOW()
    WHERE EXISTS (
      SELECT 1 FROM players p
      JOIN matches m ON NEW.match_id = m.id
      WHERE p.id = NEW.player_id
      AND p.team_id = ts.team_id
      AND m.tournament_id = ts.tournament_id
    );
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_team_cards_from_player_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_cards_from_player_stats() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Update team stats with card information when player stats are inserted/updated
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE team_stats ts
    SET 
      yellow_cards = (
        SELECT COALESCE(SUM(ps.yellow_cards), 0)
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN matches m ON ps.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      red_cards = (
        SELECT COALESCE(SUM(ps.red_cards), 0)
        FROM player_stats ps
        JOIN players p ON ps.player_id = p.id
        JOIN matches m ON ps.match_id = m.id
        WHERE p.team_id = ts.team_id 
        AND m.tournament_id = ts.tournament_id
      ),
      updated_at = NOW()
    WHERE EXISTS (
      SELECT 1 FROM players p
      JOIN matches m ON NEW.match_id = m.id
      WHERE p.id = NEW.player_id
      AND p.team_id = ts.team_id
      AND m.tournament_id = ts.tournament_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: update_team_stats_after_match(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_team_stats_after_match() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  -- Only process if match is finished
  IF NEW.status = 'finished' AND OLD.status != 'finished' THEN
    
    -- Update home team stats
    INSERT INTO team_stats (
      team_id, 
      tournament_id, 
      league_id,
      matches_played,
      matches_won,
      matches_drawn,
      matches_lost,
      goals_for,
      goals_against,
      clean_sheets,
      biggest_win_margin,
      biggest_loss_margin,
      last_match_date,
      last_win_date
    )
    SELECT 
      NEW.home_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      NEW.home_score,
      NEW.away_score,
      CASE WHEN NEW.away_score = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.home_score > NEW.away_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.home_team_id
    ON CONFLICT (team_id, tournament_id) 
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + NEW.home_score,
      goals_against = team_stats.goals_against + NEW.away_score,
      clean_sheets = team_stats.clean_sheets + CASE WHEN NEW.away_score = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin, 
        CASE WHEN NEW.home_score > NEW.away_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.home_score < NEW.away_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE 
        WHEN NEW.home_score > NEW.away_score THEN NEW.match_date 
        ELSE team_stats.last_win_date 
      END,
      updated_at = NOW();

    -- Update away team stats
    INSERT INTO team_stats (
      team_id, 
      tournament_id, 
      league_id,
      matches_played,
      matches_won,
      matches_drawn,
      matches_lost,
      goals_for,
      goals_against,
      clean_sheets,
      biggest_win_margin,
      biggest_loss_margin,
      last_match_date,
      last_win_date
    )
    SELECT 
      NEW.away_team_id,
      NEW.tournament_id,
      t.league_id,
      1,
      CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      NEW.away_score,
      NEW.home_score,
      CASE WHEN NEW.home_score = 0 THEN 1 ELSE 0 END,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END,
      CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END,
      NEW.match_date,
      CASE WHEN NEW.away_score > NEW.home_score THEN NEW.match_date ELSE NULL END
    FROM teams t
    WHERE t.id = NEW.away_team_id
    ON CONFLICT (team_id, tournament_id) 
    DO UPDATE SET
      matches_played = team_stats.matches_played + 1,
      matches_won = team_stats.matches_won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
      matches_drawn = team_stats.matches_drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
      matches_lost = team_stats.matches_lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
      goals_for = team_stats.goals_for + NEW.away_score,
      goals_against = team_stats.goals_against + NEW.home_score,
      clean_sheets = team_stats.clean_sheets + CASE WHEN NEW.home_score = 0 THEN 1 ELSE 0 END,
      biggest_win_margin = GREATEST(team_stats.biggest_win_margin,
        CASE WHEN NEW.away_score > NEW.home_score THEN NEW.away_score - NEW.home_score ELSE 0 END),
      biggest_loss_margin = GREATEST(team_stats.biggest_loss_margin,
        CASE WHEN NEW.away_score < NEW.home_score THEN NEW.home_score - NEW.away_score ELSE 0 END),
      last_match_date = NEW.match_date,
      last_win_date = CASE 
        WHEN NEW.away_score > NEW.home_score THEN NEW.match_date 
        ELSE team_stats.last_win_date 
      END,
      updated_at = NOW();
      
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_whatsapp_last_interaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_whatsapp_last_interaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE whatsapp_user_links
  SET last_interaction_at = now()
  WHERE phone_number = NEW.user_identifier
    AND is_active = true;
  RETURN NEW;
END;
$$;


--
-- Name: verify_team_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_team_stats() RETURNS TABLE(team_name text, tournament_name text, stats_matches_played integer, actual_matches_played bigint, stats_points integer, stats_goals_for integer, stats_goals_against integer, stats_goal_difference integer, verification_status text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.name as team_name,
        tr.name as tournament_name,
        ts.matches_played as stats_matches_played,
        COUNT(m.id) as actual_matches_played,
        ts.points as stats_points,
        ts.goals_for as stats_goals_for,
        ts.goals_against as stats_goals_against,
        ts.goal_difference as stats_goal_difference,
        CASE 
            WHEN ts.matches_played = COUNT(m.id) THEN '✅ CORRECT'
            ELSE '❌ MISMATCH'
        END as verification_status
    FROM team_stats ts
    JOIN teams t ON ts.team_id = t.id
    JOIN tournaments tr ON ts.tournament_id = tr.id
    LEFT JOIN matches m ON (m.home_team_id = ts.team_id OR m.away_team_id = ts.team_id) 
                        AND m.tournament_id = ts.tournament_id 
                        AND m.status = 'finished'
    GROUP BY ts.id, t.name, tr.name, ts.matches_played, ts.points, 
             ts.goals_for, ts.goals_against, ts.goal_difference
    ORDER BY t.name, tr.name;
END;
$$;


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text,
    encrypted_password text,
    email_confirmed_at timestamp with time zone,
    raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
    raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
    phone text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_sign_in_at timestamp with time zone,
    role text,
    aud text,
    instance_id uuid
);


--
-- Name: agent_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid,
    action_type text NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text,
    executed_at timestamp with time zone,
    execution_result jsonb,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_actions_action_type_check CHECK ((action_type = ANY (ARRAY['show_match'::text, 'show_jornada'::text, 'show_standings'::text, 'show_team'::text, 'request_reschedule'::text, 'escalate_to_human'::text, 'send_reminder'::text, 'generate_report'::text, 'custom'::text]))),
    CONSTRAINT agent_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'executed'::text, 'failed'::text])))
);


--
-- Name: agent_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    channel text NOT NULL,
    user_identifier text NOT NULL,
    whatsapp_link_id uuid,
    league_id uuid,
    tournament_id uuid,
    user_message text NOT NULL,
    agent_response text,
    agent_response_tokens integer,
    rag_chunks_used jsonb,
    rag_search_query text,
    rag_similarity_threshold real,
    sql_queries_executed jsonb,
    intent text,
    intent_confidence real,
    actions jsonb,
    latency_ms integer,
    llm_model text,
    llm_cost_usd real,
    user_feedback text,
    escalated_to_human boolean DEFAULT false,
    delivery_status text,
    delivery_error text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT agent_conversations_channel_check CHECK ((channel = ANY (ARRAY['whatsapp'::text, 'web'::text, 'mobile'::text]))),
    CONSTRAINT agent_conversations_delivery_status_check CHECK ((delivery_status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text, 'read'::text]))),
    CONSTRAINT agent_conversations_user_feedback_check CHECK ((user_feedback = ANY (ARRAY['positive'::text, 'negative'::text, 'neutral'::text])))
);


--
-- Name: agent_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_identifier text NOT NULL,
    window_start timestamp with time zone NOT NULL,
    window_end timestamp with time zone NOT NULL,
    message_count integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: asistencias_qr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asistencias_qr (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    match_id uuid NOT NULL,
    recognition_mode text DEFAULT 'quick'::text NOT NULL,
    confidence_score numeric(4,3) DEFAULT 1.0,
    similarity_score numeric(4,3) DEFAULT 1.0,
    photo_path text,
    device_info jsonb,
    location_data jsonb,
    face_quality_score numeric(4,3),
    processing_time_ms integer,
    cache_hit boolean DEFAULT false,
    operator_id text,
    local_timestamp timestamp with time zone DEFAULT now() NOT NULL,
    sync_status text DEFAULT 'synced'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: coaching_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coaching_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    photo text,
    birth_date date,
    cedula text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: content_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.content_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    recording_id uuid,
    clip_id uuid,
    reaction_type text DEFAULT 'like'::text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT content_reactions_content_type_check CHECK ((content_type = ANY (ARRAY['recording'::text, 'clip'::text]))),
    CONSTRAINT content_reactions_reaction_type_check CHECK ((reaction_type = ANY (ARRAY['like'::text, 'fire'::text, 'goal'::text, 'save'::text, 'wow'::text]))),
    CONSTRAINT reactions_single_content CHECK ((((content_type = 'recording'::text) AND (recording_id IS NOT NULL) AND (clip_id IS NULL)) OR ((content_type = 'clip'::text) AND (clip_id IS NOT NULL) AND (recording_id IS NULL))))
);


--
-- Name: facial_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facial_attendance (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    match_id uuid NOT NULL,
    recognition_mode public.recognition_mode DEFAULT 'quick'::public.recognition_mode NOT NULL,
    confidence_score numeric(4,3) NOT NULL,
    similarity_score numeric(4,3) NOT NULL,
    photo_path text,
    device_info jsonb,
    location_data jsonb,
    face_quality_score numeric(4,3),
    processing_time_ms integer,
    cache_hit boolean DEFAULT false,
    operator_id text,
    local_timestamp timestamp with time zone NOT NULL,
    server_timestamp timestamp with time zone DEFAULT now(),
    sync_status public.sync_status DEFAULT 'synced'::public.sync_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT facial_attendance_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT facial_attendance_similarity_score_check CHECK (((similarity_score >= (0)::numeric) AND (similarity_score <= (1)::numeric)))
);


--
-- Name: finance_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.finance_config (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    league_id uuid NOT NULL,
    tournament_id uuid,
    name text DEFAULT 'default'::text,
    team_registration_fee numeric(10,2) DEFAULT 0,
    player_registration_fee numeric(10,2) DEFAULT 0,
    late_registration_surcharge numeric(10,2) DEFAULT 0,
    yellow_card_fine numeric(10,2) DEFAULT 50,
    red_card_fine numeric(10,2) DEFAULT 150,
    double_yellow_fine numeric(10,2) DEFAULT 100,
    absence_fine numeric(10,2) DEFAULT 500,
    late_arrival_fine numeric(10,2) DEFAULT 100,
    misconduct_fine numeric(10,2) DEFAULT 200,
    uniform_violation_fine numeric(10,2) DEFAULT 100,
    referee_fee_per_match numeric(10,2) DEFAULT 300,
    assistant_referee_fee numeric(10,2) DEFAULT 150,
    field_rental_per_match numeric(10,2) DEFAULT 0,
    currency text DEFAULT 'MXN'::text,
    payment_due_days integer DEFAULT 7,
    auto_generate_fines boolean DEFAULT true,
    auto_generate_referee_fees boolean DEFAULT false,
    notify_on_new_charge boolean DEFAULT true,
    notify_on_overdue boolean DEFAULT true,
    overdue_grace_days integer DEFAULT 3,
    payment_instructions text,
    bank_account_info text,
    is_active boolean DEFAULT true,
    created_by uuid,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT finance_config_absence_fine_check CHECK ((absence_fine >= (0)::numeric)),
    CONSTRAINT finance_config_assistant_referee_fee_check CHECK ((assistant_referee_fee >= (0)::numeric)),
    CONSTRAINT finance_config_currency_check CHECK ((currency = ANY (ARRAY['MXN'::text, 'USD'::text, 'EUR'::text, 'COP'::text, 'ARS'::text, 'CLP'::text, 'PEN'::text]))),
    CONSTRAINT finance_config_double_yellow_fine_check CHECK ((double_yellow_fine >= (0)::numeric)),
    CONSTRAINT finance_config_field_rental_per_match_check CHECK ((field_rental_per_match >= (0)::numeric)),
    CONSTRAINT finance_config_late_arrival_fine_check CHECK ((late_arrival_fine >= (0)::numeric)),
    CONSTRAINT finance_config_late_registration_surcharge_check CHECK ((late_registration_surcharge >= (0)::numeric)),
    CONSTRAINT finance_config_misconduct_fine_check CHECK ((misconduct_fine >= (0)::numeric)),
    CONSTRAINT finance_config_overdue_grace_days_check CHECK ((overdue_grace_days >= 0)),
    CONSTRAINT finance_config_payment_due_days_check CHECK (((payment_due_days >= 0) AND (payment_due_days <= 90))),
    CONSTRAINT finance_config_player_registration_fee_check CHECK ((player_registration_fee >= (0)::numeric)),
    CONSTRAINT finance_config_red_card_fine_check CHECK ((red_card_fine >= (0)::numeric)),
    CONSTRAINT finance_config_referee_fee_per_match_check CHECK ((referee_fee_per_match >= (0)::numeric)),
    CONSTRAINT finance_config_team_registration_fee_check CHECK ((team_registration_fee >= (0)::numeric)),
    CONSTRAINT finance_config_uniform_violation_fine_check CHECK ((uniform_violation_fine >= (0)::numeric)),
    CONSTRAINT finance_config_yellow_card_fine_check CHECK ((yellow_card_fine >= (0)::numeric))
);


--
-- Name: leagues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leagues (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    logo text,
    admin_id uuid NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    product_mode text DEFAULT 'full'::text NOT NULL,
    features jsonb DEFAULT '{"ai_agent": true, "qr_codes": true, "mobile_app": true, "statistics": true, "manual_entry": true, "public_portal": true, "realtime_updates": true, "facial_recognition": true}'::jsonb,
    mode_updated_at timestamp with time zone,
    mode_updated_by uuid,
    CONSTRAINT leagues_product_mode_check CHECK ((product_mode = ANY (ARRAY['full'::text, 'web_only'::text])))
);


--
-- Name: finance_league_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.finance_league_summary AS
 SELECT l.id AS league_id,
    l.name AS league_name,
    l.slug AS league_slug,
    (COALESCE(sum(
        CASE
            WHEN (ft.is_income AND (ft.status <> 'cancelled'::public.finance_transaction_status)) THEN ft.amount
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_income,
    (COALESCE(sum(
        CASE
            WHEN ((NOT ft.is_income) AND (ft.status <> 'cancelled'::public.finance_transaction_status) AND (ft.status <> 'waived'::public.finance_transaction_status)) THEN ft.amount
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_charges,
    (COALESCE(sum(
        CASE
            WHEN ((NOT ft.is_income) AND (ft.status = ANY (ARRAY['paid'::public.finance_transaction_status, 'partial'::public.finance_transaction_status]))) THEN ft.amount_paid
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_collected,
    (COALESCE(sum(
        CASE
            WHEN ((NOT ft.is_income) AND (ft.status = ANY (ARRAY['pending'::public.finance_transaction_status, 'partial'::public.finance_transaction_status, 'overdue'::public.finance_transaction_status]))) THEN (ft.amount - ft.amount_paid)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_pending,
    (COALESCE(sum(
        CASE
            WHEN (ft.status = 'overdue'::public.finance_transaction_status) THEN (ft.amount - ft.amount_paid)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_overdue,
    (count(DISTINCT ft.team_id))::integer AS teams_with_transactions,
    (count(ft.id))::integer AS total_transactions,
    (count(
        CASE
            WHEN (ft.status = 'overdue'::public.finance_transaction_status) THEN 1
            ELSE NULL::integer
        END))::integer AS overdue_transactions,
    (COALESCE(sum(
        CASE
            WHEN ((ft.transaction_type = ANY (ARRAY['yellow_card_fine'::public.finance_transaction_type, 'red_card_fine'::public.finance_transaction_type, 'double_yellow_fine'::public.finance_transaction_type])) AND (ft.status <> 'cancelled'::public.finance_transaction_status) AND (ft.status <> 'waived'::public.finance_transaction_status)) THEN ft.amount
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_card_fines,
    min(ft.transaction_date) AS first_transaction_date,
    max(ft.transaction_date) AS last_transaction_date
   FROM (public.leagues l
     LEFT JOIN public.finance_transactions ft ON ((ft.league_id = l.id)))
  WHERE (((l.features ->> 'finance'::text))::boolean = true)
  GROUP BY l.id, l.name, l.slug;


--
-- Name: teams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    league_id uuid NOT NULL,
    tournament_id uuid,
    owner_id uuid NOT NULL,
    logo text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    home_primary_color character varying(7),
    home_secondary_color character varying(7),
    home_accent_color character varying(7),
    away_primary_color character varying(7),
    away_secondary_color character varying(7),
    away_accent_color character varying(7),
    alt1_shorts_color character varying(7),
    alt2_shorts_color character varying(7),
    group_name character varying(10) DEFAULT NULL::character varying,
    CONSTRAINT teams_alt1_shorts_color_check CHECK (((alt1_shorts_color IS NULL) OR ((alt1_shorts_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_alt2_shorts_color_check CHECK (((alt2_shorts_color IS NULL) OR ((alt2_shorts_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_away_accent_color_check CHECK (((away_accent_color IS NULL) OR ((away_accent_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_away_primary_color_check CHECK (((away_primary_color IS NULL) OR ((away_primary_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_away_secondary_color_check CHECK (((away_secondary_color IS NULL) OR ((away_secondary_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_group_name_check CHECK (((group_name IS NULL) OR ((group_name)::text ~ '^[A-Z]$'::text))),
    CONSTRAINT teams_home_accent_color_check CHECK (((home_accent_color IS NULL) OR ((home_accent_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_home_primary_color_check CHECK (((home_primary_color IS NULL) OR ((home_primary_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text))),
    CONSTRAINT teams_home_secondary_color_check CHECK (((home_secondary_color IS NULL) OR ((home_secondary_color)::text ~ '^#[0-9A-Fa-f]{6}$'::text)))
);


--
-- Name: finance_team_balances; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.finance_team_balances AS
 SELECT t.id AS team_id,
    t.name AS team_name,
    t.slug AS team_slug,
    t.logo AS team_logo,
    t.league_id,
    l.name AS league_name,
    t.tournament_id,
    (COALESCE(sum(
        CASE
            WHEN ((NOT ft.is_income) AND (ft.status <> 'cancelled'::public.finance_transaction_status) AND (ft.status <> 'waived'::public.finance_transaction_status)) THEN ft.amount
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_charges,
    (COALESCE(sum(
        CASE
            WHEN (ft.is_income AND (ft.status <> 'cancelled'::public.finance_transaction_status)) THEN ft.amount
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS total_paid,
    (COALESCE(sum(
        CASE
            WHEN (ft.is_income AND (ft.status <> 'cancelled'::public.finance_transaction_status)) THEN ft.amount
            WHEN ((NOT ft.is_income) AND (ft.status <> 'cancelled'::public.finance_transaction_status) AND (ft.status <> 'waived'::public.finance_transaction_status)) THEN (- ft.amount)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS balance,
    (COALESCE(sum(
        CASE
            WHEN ((NOT ft.is_income) AND (ft.status = ANY (ARRAY['pending'::public.finance_transaction_status, 'partial'::public.finance_transaction_status, 'overdue'::public.finance_transaction_status]))) THEN (ft.amount - ft.amount_paid)
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(10,2) AS pending_balance,
    (count(
        CASE
            WHEN (ft.status = 'overdue'::public.finance_transaction_status) THEN 1
            ELSE NULL::integer
        END))::integer AS overdue_count,
    (count(
        CASE
            WHEN ((ft.transaction_type = ANY (ARRAY['yellow_card_fine'::public.finance_transaction_type, 'red_card_fine'::public.finance_transaction_type, 'double_yellow_fine'::public.finance_transaction_type, 'absence_fine'::public.finance_transaction_type])) AND (ft.status = ANY (ARRAY['pending'::public.finance_transaction_status, 'partial'::public.finance_transaction_status, 'overdue'::public.finance_transaction_status]))) THEN 1
            ELSE NULL::integer
        END))::integer AS pending_fines_count,
    max(ft.created_at) AS last_transaction_at
   FROM ((public.teams t
     JOIN public.leagues l ON ((l.id = t.league_id)))
     LEFT JOIN public.finance_transactions ft ON ((ft.team_id = t.id)))
  WHERE (((l.features ->> 'finance'::text))::boolean = true)
  GROUP BY t.id, t.name, t.slug, t.logo, t.league_id, l.name, t.tournament_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    role public.user_role DEFAULT 'public'::public.user_role,
    league_id uuid,
    team_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: league_features_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.league_features_summary AS
 SELECT l.id AS league_id,
    l.name AS league_name,
    l.product_mode,
    l.features,
    ((l.features ->> 'qr_codes'::text) = 'true'::text) AS has_qr,
    ((l.features ->> 'facial_recognition'::text) = 'true'::text) AS has_facial,
    ((l.features ->> 'mobile_app'::text) = 'true'::text) AS has_mobile,
    ((l.features ->> 'realtime_updates'::text) = 'true'::text) AS has_realtime,
    ((l.features ->> 'manual_entry'::text) = 'true'::text) AS has_manual,
    ((l.features ->> 'public_portal'::text) = 'true'::text) AS has_portal,
    ((l.features ->> 'statistics'::text) = 'true'::text) AS has_stats,
    ((l.features ->> 'ai_agent'::text) = 'true'::text) AS has_ai,
    l.mode_updated_at,
    l.mode_updated_by,
    u.email AS mode_updated_by_email
   FROM (public.leagues l
     LEFT JOIN public.users u ON ((l.mode_updated_by = u.id)));


--
-- Name: league_knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.league_knowledge_base (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    league_id uuid NOT NULL,
    tournament_id uuid,
    content_type text NOT NULL,
    content_text text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    embedding public.vector(1536),
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    is_auto_generated boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    match_id uuid,
    CONSTRAINT knowledge_base_content_not_empty CHECK ((length(content_text) > 0)),
    CONSTRAINT league_knowledge_base_content_type_check CHECK ((content_type = ANY (ARRAY['jornada'::text, 'tabla_posiciones'::text, 'suspensiones'::text, 'resultados'::text, 'resultado_partido'::text, 'estadisticas'::text, 'proximo_partido'::text])))
);


--
-- Name: live_streams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.live_streams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    league_id uuid,
    mux_live_stream_id text,
    mux_stream_key text,
    mux_playback_id text,
    recording_id uuid,
    recording_asset_id text,
    recording_playback_id text,
    recording_duration numeric,
    recording_ready boolean DEFAULT false,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    status text DEFAULT 'idle'::text,
    source_type text DEFAULT 'xbotgo'::text,
    is_pay_per_view boolean DEFAULT false,
    price_cents integer,
    peak_viewers integer DEFAULT 0,
    current_viewers integer DEFAULT 0,
    total_unique_viewers integer DEFAULT 0,
    scheduled_start timestamp with time zone,
    actual_start timestamp with time zone,
    ended_at timestamp with time zone,
    broadcaster_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT live_streams_source_type_check CHECK ((source_type = ANY (ARRAY['xbotgo'::text, 'obs'::text, 'mobile'::text, 'web'::text]))),
    CONSTRAINT live_streams_status_check CHECK ((status = ANY (ARRAY['idle'::text, 'connecting'::text, 'live'::text, 'ended'::text, 'failed'::text])))
);


--
-- Name: match_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_cards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    card_type public.card_type NOT NULL,
    minute integer NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_cards_minute_check CHECK (((minute >= 1) AND (minute <= 120)))
);


--
-- Name: match_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_goals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    minute integer NOT NULL,
    goal_type public.goal_type DEFAULT 'normal'::public.goal_type,
    assist_player_id uuid,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_goals_minute_check CHECK (((minute >= 1) AND (minute <= 120)))
);


--
-- Name: match_incidents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_incidents (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    minute integer,
    incident_type character varying(100) NOT NULL,
    description text NOT NULL,
    player_id uuid,
    team_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT match_incidents_minute_check CHECK (((minute IS NULL) OR ((minute >= 1) AND (minute <= 120))))
);


--
-- Name: match_recordings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_recordings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    match_id uuid,
    league_id uuid,
    tournament_id uuid,
    source_type text DEFAULT 'manual'::text,
    source_device_id text,
    video_url text,
    mux_asset_id text,
    mux_playback_id text,
    title text NOT NULL,
    description text,
    thumbnail_url text,
    duration_seconds integer,
    resolution text DEFAULT '1080p'::text,
    file_size_bytes bigint,
    status text DEFAULT 'pending'::text,
    processing_progress integer DEFAULT 0,
    error_message text,
    ai_analyzed boolean DEFAULT false,
    highlights_generated boolean DEFAULT false,
    transcript text,
    visibility text DEFAULT 'public'::text,
    is_premium boolean DEFAULT false,
    price_cents integer,
    views_count integer DEFAULT 0,
    unique_viewers integer DEFAULT 0,
    total_watch_time_seconds bigint DEFAULT 0,
    avg_watch_percentage numeric DEFAULT 0,
    likes_count integer DEFAULT 0,
    recorded_at timestamp with time zone,
    uploaded_by uuid,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    home_score integer,
    away_score integer,
    CONSTRAINT match_recordings_source_type_check CHECK ((source_type = ANY (ARRAY['xbotgo'::text, 'manual'::text, 'stream_archive'::text]))),
    CONSTRAINT match_recordings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'uploading'::text, 'processing'::text, 'ready'::text, 'failed'::text]))),
    CONSTRAINT match_recordings_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'private'::text, 'unlisted'::text, 'premium'::text])))
);


--
-- Name: match_referee_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_referee_reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    match_id uuid NOT NULL,
    referee_name character varying(255),
    assistant_referee_1 character varying(255),
    assistant_referee_2 character varying(255),
    fourth_official character varying(255),
    general_observations text,
    weather_conditions character varying(255),
    field_conditions character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tournament_id uuid NOT NULL,
    home_team_id uuid NOT NULL,
    away_team_id uuid NOT NULL,
    home_score integer DEFAULT 0,
    away_score integer DEFAULT 0,
    match_date timestamp with time zone NOT NULL,
    status public.match_status DEFAULT 'scheduled'::public.match_status,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    match_time time without time zone,
    field_number integer,
    round integer,
    bye_team_id uuid,
    phase text DEFAULT 'regular'::text,
    playoff_round text,
    playoff_position integer,
    leg text,
    CONSTRAINT matches_away_score_check CHECK ((away_score >= 0)),
    CONSTRAINT matches_different_teams_check CHECK ((home_team_id <> away_team_id)),
    CONSTRAINT matches_field_number_check CHECK ((field_number > 0)),
    CONSTRAINT matches_home_score_check CHECK ((home_score >= 0)),
    CONSTRAINT matches_leg_check CHECK (((leg IS NULL) OR (leg = ANY (ARRAY['first'::text, 'second'::text])))),
    CONSTRAINT matches_phase_check CHECK ((phase = ANY (ARRAY['regular'::text, 'playoffs'::text]))),
    CONSTRAINT matches_playoff_round_check CHECK (((playoff_round IS NULL) OR (playoff_round = ANY (ARRAY['quarterfinals'::text, 'semifinals'::text, 'final'::text, 'third_place'::text])))),
    CONSTRAINT matches_round_check CHECK ((round > 0))
);


--
-- Name: player_registration_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_registration_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    tournament_id uuid NOT NULL,
    player_name character varying(255) NOT NULL,
    player_position character varying(100) NOT NULL,
    jersey_number integer NOT NULL,
    birth_date date,
    reason text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    requested_by uuid NOT NULL,
    reviewed_by uuid,
    review_notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    CONSTRAINT player_registration_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: player_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_stats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    match_id uuid,
    goals integer DEFAULT 0,
    assists integer DEFAULT 0,
    yellow_cards integer DEFAULT 0,
    red_cards integer DEFAULT 0,
    minutes_played integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_extemporaneous boolean DEFAULT false,
    CONSTRAINT player_stats_assists_check CHECK ((assists >= 0)),
    CONSTRAINT player_stats_goals_check CHECK ((goals >= 0)),
    CONSTRAINT player_stats_minutes_played_check CHECK (((minutes_played >= 0) AND (minutes_played <= 120))),
    CONSTRAINT player_stats_red_cards_check CHECK ((red_cards >= 0)),
    CONSTRAINT player_stats_red_cards_max_check CHECK ((red_cards <= 1)),
    CONSTRAINT player_stats_yellow_cards_check CHECK ((yellow_cards >= 0)),
    CONSTRAINT player_stats_yellow_cards_max_check CHECK ((yellow_cards <= 2))
);


--
-- Name: player_suspensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_suspensions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    player_id uuid NOT NULL,
    team_id uuid NOT NULL,
    league_id uuid NOT NULL,
    tournament_id uuid,
    suspension_type public.suspension_type NOT NULL,
    reason text NOT NULL,
    matches_to_serve integer DEFAULT 1 NOT NULL,
    matches_served integer DEFAULT 0 NOT NULL,
    status public.suspension_status DEFAULT 'active'::public.suspension_status NOT NULL,
    match_card_id uuid,
    match_id uuid,
    created_by uuid,
    updated_by uuid,
    notes text,
    start_date timestamp with time zone DEFAULT now(),
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT matches_served_check CHECK (((matches_served >= 0) AND (matches_served <= matches_to_serve)))
);


--
-- Name: players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.players (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    team_id uuid NOT NULL,
    "position" text NOT NULL,
    jersey_number integer NOT NULL,
    photo text,
    birth_date date,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    face_embedding public.vector(512),
    face_quality_score numeric(4,3),
    enrollment_status text,
    enrollment_metadata jsonb,
    id_document_url text,
    id_verified boolean DEFAULT false,
    id_verified_at timestamp with time zone,
    id_verified_by uuid,
    id_verification_method text,
    extracted_name text,
    extracted_curp text,
    CONSTRAINT players_enrollment_status_check CHECK ((enrollment_status = ANY (ARRAY['enrolled'::text, 'pending'::text, 'failed'::text]))),
    CONSTRAINT players_id_verification_method_check CHECK ((id_verification_method = ANY (ARRAY['automatic'::text, 'manual'::text]))),
    CONSTRAINT players_jersey_number_check CHECK (((jersey_number > 0) AND (jersey_number <= 99)))
);


--
-- Name: profiles; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles AS
 SELECT id,
    name,
    email,
    phone,
    role,
    league_id,
    team_id,
    is_active,
    created_at,
    updated_at
   FROM public.users;


--
-- Name: stream_chat; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_chat (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    stream_id uuid,
    user_id uuid,
    user_name text NOT NULL,
    user_avatar text,
    message text NOT NULL,
    message_type text DEFAULT 'user'::text,
    is_pinned boolean DEFAULT false,
    is_deleted boolean DEFAULT false,
    deleted_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stream_chat_message_type_check CHECK ((message_type = ANY (ARRAY['user'::text, 'ai_commentator'::text, 'system'::text, 'highlight'::text])))
);


--
-- Name: stream_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    stream_id uuid,
    recording_id uuid,
    payment_provider text,
    payment_id text,
    amount_cents integer NOT NULL,
    currency text DEFAULT 'MXN'::text,
    access_granted_at timestamp with time zone DEFAULT now(),
    access_expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT stream_purchases_payment_provider_check CHECK ((payment_provider = ANY (ARRAY['stripe'::text, 'mercadopago'::text])))
);


--
-- Name: suspension_match_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suspension_match_applications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    suspension_id uuid NOT NULL,
    match_id uuid NOT NULL,
    applied_at timestamp with time zone DEFAULT now()
);


--
-- Name: team_stats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_stats (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    tournament_id uuid NOT NULL,
    league_id uuid NOT NULL,
    matches_played integer DEFAULT 0,
    matches_won integer DEFAULT 0,
    matches_drawn integer DEFAULT 0,
    matches_lost integer DEFAULT 0,
    goals_for integer DEFAULT 0,
    goals_against integer DEFAULT 0,
    goal_difference integer GENERATED ALWAYS AS ((goals_for - goals_against)) STORED,
    points integer GENERATED ALWAYS AS (((matches_won * 3) + matches_drawn)) STORED,
    clean_sheets integer DEFAULT 0,
    biggest_win_margin integer DEFAULT 0,
    biggest_loss_margin integer DEFAULT 0,
    yellow_cards integer DEFAULT 0,
    red_cards integer DEFAULT 0,
    total_attendance integer DEFAULT 0,
    average_attendance numeric(5,2),
    recent_form text DEFAULT ''::text,
    last_match_date timestamp with time zone,
    last_win_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    points_adjustment integer DEFAULT 0,
    adjustment_reason text,
    CONSTRAINT team_stats_attendance_check CHECK ((total_attendance >= 0)),
    CONSTRAINT team_stats_cards_check CHECK (((yellow_cards >= 0) AND (red_cards >= 0))),
    CONSTRAINT team_stats_clean_sheets_check CHECK (((clean_sheets >= 0) AND (clean_sheets <= matches_played))),
    CONSTRAINT team_stats_goals_check CHECK (((goals_for >= 0) AND (goals_against >= 0))),
    CONSTRAINT team_stats_match_total_check CHECK ((((matches_won + matches_drawn) + matches_lost) = matches_played)),
    CONSTRAINT team_stats_matches_drawn_check CHECK (((matches_drawn >= 0) AND (matches_drawn <= matches_played))),
    CONSTRAINT team_stats_matches_lost_check CHECK (((matches_lost >= 0) AND (matches_lost <= matches_played))),
    CONSTRAINT team_stats_matches_played_check CHECK ((matches_played >= 0)),
    CONSTRAINT team_stats_matches_won_check CHECK (((matches_won >= 0) AND (matches_won <= matches_played)))
);


--
-- Name: tournaments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tournaments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    league_id uuid NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    max_players integer,
    registration_open boolean DEFAULT true,
    max_coaching_staff integer DEFAULT 10,
    tournament_format text DEFAULT 'league'::text,
    number_of_groups integer,
    teams_advancing_per_group integer DEFAULT 2,
    rounds_per_season integer DEFAULT 1,
    has_third_place_match boolean DEFAULT false,
    age_validation_enabled boolean DEFAULT false,
    min_age integer,
    max_age integer,
    age_reference_date date,
    age_exception_count integer DEFAULT 0,
    age_exception_min_age integer,
    age_exception_max_age integer,
    id_document_required boolean DEFAULT false,
    CONSTRAINT tournaments_date_check CHECK ((start_date <= end_date)),
    CONSTRAINT tournaments_number_of_groups_check CHECK (((number_of_groups IS NULL) OR ((number_of_groups >= 2) AND (number_of_groups <= 8)))),
    CONSTRAINT tournaments_rounds_per_season_check CHECK (((rounds_per_season >= 1) AND (rounds_per_season <= 4))),
    CONSTRAINT tournaments_teams_advancing_per_group_check CHECK (((teams_advancing_per_group >= 1) AND (teams_advancing_per_group <= 4))),
    CONSTRAINT tournaments_tournament_format_check CHECK ((tournament_format = ANY (ARRAY['league'::text, 'knockout'::text, 'group_knockout'::text])))
);


--
-- Name: team_stats_view; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.team_stats_view AS
 SELECT ts.id,
    ts.team_id,
    ts.tournament_id,
    ts.league_id,
    ts.matches_played,
    ts.matches_won,
    ts.matches_drawn,
    ts.matches_lost,
    ts.goals_for,
    ts.goals_against,
    ts.goal_difference,
    ts.points,
    ts.clean_sheets,
    ts.biggest_win_margin,
    ts.biggest_loss_margin,
    ts.yellow_cards,
    ts.red_cards,
    ts.total_attendance,
    ts.average_attendance,
    ts.recent_form,
    ts.last_match_date,
    ts.last_win_date,
    ts.created_at,
    ts.updated_at,
    t.name AS team_name,
    t.slug AS team_slug,
    t.logo AS team_logo,
    tr.name AS tournament_name,
    l.name AS league_name,
    row_number() OVER (PARTITION BY ts.tournament_id ORDER BY ts.points DESC, ts.goal_difference DESC, ts.goals_for DESC) AS tournament_position,
    round((((ts.matches_won)::numeric / (NULLIF(ts.matches_played, 0))::numeric) * (100)::numeric), 1) AS win_percentage,
    round(((ts.goals_for)::numeric / (NULLIF(ts.matches_played, 0))::numeric), 2) AS goals_per_match,
    round(((ts.goals_against)::numeric / (NULLIF(ts.matches_played, 0))::numeric), 2) AS goals_conceded_per_match
   FROM (((public.team_stats ts
     JOIN public.teams t ON ((ts.team_id = t.id)))
     JOIN public.tournaments tr ON ((ts.tournament_id = tr.id)))
     JOIN public.leagues l ON ((ts.league_id = l.id)));


--
-- Name: user_follows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_follows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    entity_type text NOT NULL,
    league_id uuid,
    team_id uuid,
    player_id uuid,
    notifications_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT follows_single_entity CHECK ((((entity_type = 'league'::text) AND (league_id IS NOT NULL) AND (team_id IS NULL) AND (player_id IS NULL)) OR ((entity_type = 'team'::text) AND (team_id IS NOT NULL) AND (league_id IS NULL) AND (player_id IS NULL)) OR ((entity_type = 'player'::text) AND (player_id IS NOT NULL) AND (league_id IS NULL) AND (team_id IS NULL)))),
    CONSTRAINT user_follows_entity_type_check CHECK ((entity_type = ANY (ARRAY['league'::text, 'team'::text, 'player'::text])))
);


--
-- Name: video_clips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.video_clips (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recording_id uuid,
    match_id uuid,
    league_id uuid,
    clip_type text,
    clip_url text,
    mux_asset_id text,
    mux_playback_id text,
    thumbnail_url text,
    start_time_seconds numeric NOT NULL,
    end_time_seconds numeric NOT NULL,
    duration_seconds numeric GENERATED ALWAYS AS ((end_time_seconds - start_time_seconds)) STORED,
    title text NOT NULL,
    description text,
    match_minute integer,
    player_id uuid,
    team_id uuid,
    ai_generated boolean DEFAULT false,
    ai_confidence numeric,
    ai_tags text[],
    views_count integer DEFAULT 0,
    likes_count integer DEFAULT 0,
    shares_count integer DEFAULT 0,
    is_featured boolean DEFAULT false,
    featured_order integer,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT video_clips_clip_type_check CHECK ((clip_type = ANY (ARRAY['goal'::text, 'save'::text, 'yellow_card'::text, 'red_card'::text, 'penalty'::text, 'highlight'::text, 'custom'::text, 'ai_generated'::text])))
);


--
-- Name: watch_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watch_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    content_type text NOT NULL,
    recording_id uuid,
    clip_id uuid,
    stream_id uuid,
    watch_duration_seconds integer DEFAULT 0,
    last_position_seconds integer DEFAULT 0,
    watch_percentage numeric DEFAULT 0,
    completed boolean DEFAULT false,
    started_at timestamp with time zone DEFAULT now(),
    last_watched_at timestamp with time zone DEFAULT now(),
    CONSTRAINT history_single_content CHECK ((((content_type = 'recording'::text) AND (recording_id IS NOT NULL) AND (clip_id IS NULL) AND (stream_id IS NULL)) OR ((content_type = 'clip'::text) AND (clip_id IS NOT NULL) AND (recording_id IS NULL) AND (stream_id IS NULL)) OR ((content_type = 'stream'::text) AND (stream_id IS NOT NULL) AND (recording_id IS NULL) AND (clip_id IS NULL)))),
    CONSTRAINT watch_history_content_type_check CHECK ((content_type = ANY (ARRAY['recording'::text, 'clip'::text, 'stream'::text])))
);


--
-- Name: whatsapp_conversation_windows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_conversation_windows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    window_opened_at timestamp with time zone NOT NULL,
    window_closes_at timestamp with time zone NOT NULL,
    opened_by text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT whatsapp_conversation_windows_opened_by_check CHECK ((opened_by = ANY (ARRAY['user_message'::text, 'business_message'::text, 'template'::text])))
);


--
-- Name: whatsapp_message_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_message_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    template_name text NOT NULL,
    category text NOT NULL,
    language text DEFAULT 'es'::text,
    header_text text,
    body_text text NOT NULL,
    footer_text text,
    variables jsonb,
    approval_status text DEFAULT 'pending'::text,
    approved_at timestamp with time zone,
    usage_count integer DEFAULT 0,
    last_used_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT whatsapp_message_templates_approval_status_check CHECK ((approval_status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT whatsapp_message_templates_category_check CHECK ((category = ANY (ARRAY['utility'::text, 'marketing'::text, 'authentication'::text])))
);


--
-- Name: whatsapp_user_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_user_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone_number text NOT NULL,
    user_id uuid,
    league_id uuid,
    tournament_id uuid,
    role text NOT NULL,
    is_active boolean DEFAULT true,
    linked_at timestamp with time zone DEFAULT now(),
    last_interaction_at timestamp with time zone,
    display_name text,
    preferred_language text DEFAULT 'es'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT whatsapp_user_links_role_check CHECK ((role = ANY (ARRAY['super_admin'::text, 'league_admin'::text, 'team_owner'::text, 'user'::text])))
);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: agent_actions agent_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_actions
    ADD CONSTRAINT agent_actions_pkey PRIMARY KEY (id);


--
-- Name: agent_conversations agent_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_pkey PRIMARY KEY (id);


--
-- Name: agent_rate_limits agent_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_rate_limits
    ADD CONSTRAINT agent_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: asistencias_qr asistencias_qr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias_qr
    ADD CONSTRAINT asistencias_qr_pkey PRIMARY KEY (id);


--
-- Name: asistencias_qr asistencias_qr_player_id_match_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias_qr
    ADD CONSTRAINT asistencias_qr_player_id_match_id_key UNIQUE (player_id, match_id);


--
-- Name: coaching_staff coaching_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_staff
    ADD CONSTRAINT coaching_staff_pkey PRIMARY KEY (id);


--
-- Name: content_reactions content_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reactions
    ADD CONSTRAINT content_reactions_pkey PRIMARY KEY (id);


--
-- Name: facial_attendance facial_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facial_attendance
    ADD CONSTRAINT facial_attendance_pkey PRIMARY KEY (id);


--
-- Name: finance_config finance_config_league_id_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_league_id_tournament_id_key UNIQUE NULLS NOT DISTINCT (league_id, tournament_id);


--
-- Name: finance_config finance_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_pkey PRIMARY KEY (id);


--
-- Name: finance_transactions finance_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_pkey PRIMARY KEY (id);


--
-- Name: user_follows follows_unique_entity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT follows_unique_entity UNIQUE (user_id, entity_type, league_id, team_id, player_id);


--
-- Name: league_knowledge_base league_knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_knowledge_base
    ADD CONSTRAINT league_knowledge_base_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_pkey PRIMARY KEY (id);


--
-- Name: leagues leagues_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_slug_key UNIQUE (slug);


--
-- Name: live_streams live_streams_mux_live_stream_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_mux_live_stream_id_key UNIQUE (mux_live_stream_id);


--
-- Name: live_streams live_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_pkey PRIMARY KEY (id);


--
-- Name: match_cards match_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_cards
    ADD CONSTRAINT match_cards_pkey PRIMARY KEY (id);


--
-- Name: match_goals match_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_goals
    ADD CONSTRAINT match_goals_pkey PRIMARY KEY (id);


--
-- Name: match_incidents match_incidents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_incidents
    ADD CONSTRAINT match_incidents_pkey PRIMARY KEY (id);


--
-- Name: match_recordings match_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_recordings
    ADD CONSTRAINT match_recordings_pkey PRIMARY KEY (id);


--
-- Name: match_referee_reports match_referee_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_referee_reports
    ADD CONSTRAINT match_referee_reports_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: player_registration_requests player_registration_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_registration_requests
    ADD CONSTRAINT player_registration_requests_pkey PRIMARY KEY (id);


--
-- Name: player_stats player_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_pkey PRIMARY KEY (id);


--
-- Name: player_suspensions player_suspensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_pkey PRIMARY KEY (id);


--
-- Name: players players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_pkey PRIMARY KEY (id);


--
-- Name: players players_team_id_jersey_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_team_id_jersey_number_key UNIQUE (team_id, jersey_number);


--
-- Name: content_reactions reactions_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reactions
    ADD CONSTRAINT reactions_unique UNIQUE (user_id, recording_id, clip_id);


--
-- Name: stream_chat stream_chat_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_chat
    ADD CONSTRAINT stream_chat_pkey PRIMARY KEY (id);


--
-- Name: stream_purchases stream_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_purchases
    ADD CONSTRAINT stream_purchases_pkey PRIMARY KEY (id);


--
-- Name: suspension_match_applications suspension_match_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_match_applications
    ADD CONSTRAINT suspension_match_applications_pkey PRIMARY KEY (id);


--
-- Name: team_stats team_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_stats
    ADD CONSTRAINT team_stats_pkey PRIMARY KEY (id);


--
-- Name: team_stats team_stats_team_id_tournament_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_stats
    ADD CONSTRAINT team_stats_team_id_tournament_id_key UNIQUE (team_id, tournament_id);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: teams teams_slug_league_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_slug_league_id_key UNIQUE (slug, league_id);


--
-- Name: tournaments tournaments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_pkey PRIMARY KEY (id);


--
-- Name: match_referee_reports unique_match_report; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_referee_reports
    ADD CONSTRAINT unique_match_report UNIQUE (match_id);


--
-- Name: suspension_match_applications unique_suspension_per_match; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_match_applications
    ADD CONSTRAINT unique_suspension_per_match UNIQUE (suspension_id, match_id);


--
-- Name: user_follows user_follows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: video_clips video_clips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_pkey PRIMARY KEY (id);


--
-- Name: watch_history watch_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_conversation_windows whatsapp_conversation_windows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_conversation_windows
    ADD CONSTRAINT whatsapp_conversation_windows_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_message_templates whatsapp_message_templates_template_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_message_templates
    ADD CONSTRAINT whatsapp_message_templates_template_name_key UNIQUE (template_name);


--
-- Name: whatsapp_user_links whatsapp_user_links_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_user_links
    ADD CONSTRAINT whatsapp_user_links_phone_number_key UNIQUE (phone_number);


--
-- Name: whatsapp_user_links whatsapp_user_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_user_links
    ADD CONSTRAINT whatsapp_user_links_pkey PRIMARY KEY (id);


--
-- Name: idx_actions_conversation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actions_conversation ON public.agent_actions USING btree (conversation_id);


--
-- Name: idx_actions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actions_status ON public.agent_actions USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: idx_actions_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actions_type ON public.agent_actions USING btree (action_type);


--
-- Name: idx_asistencias_qr_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_qr_created_at ON public.asistencias_qr USING btree (created_at);


--
-- Name: idx_asistencias_qr_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_qr_match_id ON public.asistencias_qr USING btree (match_id);


--
-- Name: idx_asistencias_qr_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asistencias_qr_player_id ON public.asistencias_qr USING btree (player_id);


--
-- Name: idx_chat_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_created ON public.stream_chat USING btree (created_at);


--
-- Name: idx_chat_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_stream ON public.stream_chat USING btree (stream_id);


--
-- Name: idx_chat_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_user ON public.stream_chat USING btree (user_id);


--
-- Name: idx_clips_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_created_at ON public.video_clips USING btree (created_at DESC);


--
-- Name: idx_clips_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_featured ON public.video_clips USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_clips_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_league ON public.video_clips USING btree (league_id);


--
-- Name: idx_clips_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_match ON public.video_clips USING btree (match_id);


--
-- Name: idx_clips_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_player ON public.video_clips USING btree (player_id);


--
-- Name: idx_clips_recording; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_recording ON public.video_clips USING btree (recording_id);


--
-- Name: idx_clips_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_team ON public.video_clips USING btree (team_id);


--
-- Name: idx_clips_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_type ON public.video_clips USING btree (clip_type);


--
-- Name: idx_clips_views; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clips_views ON public.video_clips USING btree (views_count DESC);


--
-- Name: idx_coaching_staff_cedula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaching_staff_cedula ON public.coaching_staff USING btree (cedula);


--
-- Name: idx_coaching_staff_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaching_staff_is_active ON public.coaching_staff USING btree (is_active);


--
-- Name: idx_coaching_staff_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coaching_staff_team_id ON public.coaching_staff USING btree (team_id);


--
-- Name: idx_conversation_windows_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_windows_active ON public.whatsapp_conversation_windows USING btree (window_closes_at) WHERE (is_active = true);


--
-- Name: idx_conversation_windows_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversation_windows_phone ON public.whatsapp_conversation_windows USING btree (phone_number, is_active);


--
-- Name: idx_conversations_channel; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_channel ON public.agent_conversations USING btree (channel);


--
-- Name: idx_conversations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_created ON public.agent_conversations USING btree (created_at DESC);


--
-- Name: idx_conversations_intent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_intent ON public.agent_conversations USING btree (intent);


--
-- Name: idx_conversations_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_league ON public.agent_conversations USING btree (league_id);


--
-- Name: idx_conversations_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conversations_user ON public.agent_conversations USING btree (user_identifier);


--
-- Name: idx_facial_attendance_confidence_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_confidence_score ON public.facial_attendance USING btree (confidence_score);


--
-- Name: idx_facial_attendance_local_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_local_timestamp ON public.facial_attendance USING btree (local_timestamp);


--
-- Name: idx_facial_attendance_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_match_id ON public.facial_attendance USING btree (match_id);


--
-- Name: idx_facial_attendance_match_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_match_timestamp ON public.facial_attendance USING btree (match_id, server_timestamp);


--
-- Name: idx_facial_attendance_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_player_id ON public.facial_attendance USING btree (player_id);


--
-- Name: idx_facial_attendance_recognition_mode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_recognition_mode ON public.facial_attendance USING btree (recognition_mode);


--
-- Name: idx_facial_attendance_server_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_server_timestamp ON public.facial_attendance USING btree (server_timestamp);


--
-- Name: idx_facial_attendance_sync_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_facial_attendance_sync_status ON public.facial_attendance USING btree (sync_status);


--
-- Name: idx_finance_config_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_config_active ON public.finance_config USING btree (league_id) WHERE (is_active = true);


--
-- Name: idx_finance_config_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_config_league ON public.finance_config USING btree (league_id);


--
-- Name: idx_finance_config_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_config_tournament ON public.finance_config USING btree (tournament_id) WHERE (tournament_id IS NOT NULL);


--
-- Name: idx_finance_tx_auto_generated; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_auto_generated ON public.finance_transactions USING btree (source_stat_id) WHERE (auto_generated = true);


--
-- Name: idx_finance_tx_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_created ON public.finance_transactions USING btree (created_at DESC);


--
-- Name: idx_finance_tx_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_due_date ON public.finance_transactions USING btree (due_date) WHERE (status = ANY (ARRAY['pending'::public.finance_transaction_status, 'partial'::public.finance_transaction_status]));


--
-- Name: idx_finance_tx_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_league ON public.finance_transactions USING btree (league_id);


--
-- Name: idx_finance_tx_league_status_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_league_status_date ON public.finance_transactions USING btree (league_id, status, due_date);


--
-- Name: idx_finance_tx_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_match ON public.finance_transactions USING btree (match_id) WHERE (match_id IS NOT NULL);


--
-- Name: idx_finance_tx_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_player ON public.finance_transactions USING btree (player_id) WHERE (player_id IS NOT NULL);


--
-- Name: idx_finance_tx_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_status ON public.finance_transactions USING btree (status);


--
-- Name: idx_finance_tx_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_team ON public.finance_transactions USING btree (team_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_finance_tx_team_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_team_status ON public.finance_transactions USING btree (team_id, status) WHERE (team_id IS NOT NULL);


--
-- Name: idx_finance_tx_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_tournament ON public.finance_transactions USING btree (tournament_id) WHERE (tournament_id IS NOT NULL);


--
-- Name: idx_finance_tx_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_finance_tx_type ON public.finance_transactions USING btree (transaction_type);


--
-- Name: idx_follows_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_league ON public.user_follows USING btree (league_id) WHERE (league_id IS NOT NULL);


--
-- Name: idx_follows_player; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_player ON public.user_follows USING btree (player_id) WHERE (player_id IS NOT NULL);


--
-- Name: idx_follows_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_team ON public.user_follows USING btree (team_id) WHERE (team_id IS NOT NULL);


--
-- Name: idx_follows_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follows_user ON public.user_follows USING btree (user_id);


--
-- Name: idx_history_clip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_clip ON public.watch_history USING btree (clip_id) WHERE (clip_id IS NOT NULL);


--
-- Name: idx_history_last_watched; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_last_watched ON public.watch_history USING btree (last_watched_at DESC);


--
-- Name: idx_history_recording; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_recording ON public.watch_history USING btree (recording_id) WHERE (recording_id IS NOT NULL);


--
-- Name: idx_history_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_stream ON public.watch_history USING btree (stream_id) WHERE (stream_id IS NOT NULL);


--
-- Name: idx_history_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_history_user ON public.watch_history USING btree (user_id);


--
-- Name: idx_knowledge_base_content_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_content_type ON public.league_knowledge_base USING btree (content_type);


--
-- Name: idx_knowledge_base_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_created_at ON public.league_knowledge_base USING btree (created_at DESC);


--
-- Name: idx_knowledge_base_embedding; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_embedding ON public.league_knowledge_base USING hnsw (embedding public.vector_cosine_ops) WITH (m='16', ef_construction='64');


--
-- Name: idx_knowledge_base_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_league_id ON public.league_knowledge_base USING btree (league_id);


--
-- Name: idx_knowledge_base_league_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_league_type ON public.league_knowledge_base USING btree (league_id, content_type);


--
-- Name: idx_knowledge_base_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_match_id ON public.league_knowledge_base USING btree (match_id);


--
-- Name: idx_knowledge_base_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_metadata ON public.league_knowledge_base USING gin (metadata);


--
-- Name: idx_knowledge_base_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_tournament_id ON public.league_knowledge_base USING btree (tournament_id);


--
-- Name: idx_knowledge_base_valid_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_valid_until ON public.league_knowledge_base USING btree (valid_until);


--
-- Name: idx_leagues_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_admin_id ON public.leagues USING btree (admin_id);


--
-- Name: idx_leagues_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_created_at ON public.leagues USING btree (created_at);


--
-- Name: idx_leagues_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_is_active ON public.leagues USING btree (is_active);


--
-- Name: idx_leagues_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_leagues_slug ON public.leagues USING btree (slug);


--
-- Name: idx_match_cards_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_cards_match_id ON public.match_cards USING btree (match_id);


--
-- Name: idx_match_cards_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_cards_player_id ON public.match_cards USING btree (player_id);


--
-- Name: idx_match_cards_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_cards_team_id ON public.match_cards USING btree (team_id);


--
-- Name: idx_match_goals_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_goals_match_id ON public.match_goals USING btree (match_id);


--
-- Name: idx_match_goals_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_goals_player_id ON public.match_goals USING btree (player_id);


--
-- Name: idx_match_goals_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_goals_team_id ON public.match_goals USING btree (team_id);


--
-- Name: idx_match_incidents_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_incidents_match_id ON public.match_incidents USING btree (match_id);


--
-- Name: idx_match_incidents_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_incidents_player_id ON public.match_incidents USING btree (player_id);


--
-- Name: idx_match_referee_reports_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_match_referee_reports_match_id ON public.match_referee_reports USING btree (match_id);


--
-- Name: idx_matches_away_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_away_team_id ON public.matches USING btree (away_team_id);


--
-- Name: idx_matches_bye_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_bye_team_id ON public.matches USING btree (bye_team_id);


--
-- Name: idx_matches_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_created_at ON public.matches USING btree (created_at);


--
-- Name: idx_matches_field_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_field_number ON public.matches USING btree (field_number);


--
-- Name: idx_matches_home_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_home_team_id ON public.matches USING btree (home_team_id);


--
-- Name: idx_matches_leg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_leg ON public.matches USING btree (leg) WHERE (leg IS NOT NULL);


--
-- Name: idx_matches_match_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_match_date ON public.matches USING btree (match_date);


--
-- Name: idx_matches_match_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_match_time ON public.matches USING btree (match_time);


--
-- Name: idx_matches_phase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_phase ON public.matches USING btree (phase);


--
-- Name: idx_matches_playoff_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_playoff_round ON public.matches USING btree (playoff_round) WHERE (playoff_round IS NOT NULL);


--
-- Name: idx_matches_round; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_round ON public.matches USING btree (round);


--
-- Name: idx_matches_round_bye_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_round_bye_team ON public.matches USING btree (round, bye_team_id) WHERE (bye_team_id IS NOT NULL);


--
-- Name: idx_matches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_status ON public.matches USING btree (status);


--
-- Name: idx_matches_teams; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_teams ON public.matches USING btree (home_team_id, away_team_id);


--
-- Name: idx_matches_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matches_tournament_id ON public.matches USING btree (tournament_id);


--
-- Name: idx_player_registration_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_registration_requests_status ON public.player_registration_requests USING btree (status);


--
-- Name: idx_player_registration_requests_team; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_registration_requests_team ON public.player_registration_requests USING btree (team_id);


--
-- Name: idx_player_registration_requests_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_registration_requests_tournament ON public.player_registration_requests USING btree (tournament_id);


--
-- Name: idx_player_stats_assists; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_assists ON public.player_stats USING btree (assists);


--
-- Name: idx_player_stats_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_created_at ON public.player_stats USING btree (created_at);


--
-- Name: idx_player_stats_goals; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_goals ON public.player_stats USING btree (goals);


--
-- Name: idx_player_stats_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_match_id ON public.player_stats USING btree (match_id);


--
-- Name: idx_player_stats_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_player_id ON public.player_stats USING btree (player_id);


--
-- Name: idx_player_stats_player_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_stats_player_match ON public.player_stats USING btree (player_id, match_id);


--
-- Name: idx_player_stats_unique_extemporaneous; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_player_stats_unique_extemporaneous ON public.player_stats USING btree (player_id) WHERE (match_id IS NULL);


--
-- Name: idx_player_stats_unique_match; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_player_stats_unique_match ON public.player_stats USING btree (player_id, match_id) WHERE (match_id IS NOT NULL);


--
-- Name: idx_player_suspensions_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_suspensions_league_id ON public.player_suspensions USING btree (league_id);


--
-- Name: idx_player_suspensions_player_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_suspensions_player_id ON public.player_suspensions USING btree (player_id);


--
-- Name: idx_player_suspensions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_suspensions_status ON public.player_suspensions USING btree (status);


--
-- Name: idx_player_suspensions_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_player_suspensions_team_id ON public.player_suspensions USING btree (team_id);


--
-- Name: idx_players_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_created_at ON public.players USING btree (created_at);


--
-- Name: idx_players_id_verified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_id_verified ON public.players USING btree (id_verified) WHERE (id_verified = false);


--
-- Name: idx_players_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_is_active ON public.players USING btree (is_active);


--
-- Name: idx_players_jersey_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_jersey_number ON public.players USING btree (team_id, jersey_number);


--
-- Name: idx_players_position; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_position ON public.players USING btree ("position");


--
-- Name: idx_players_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_players_team_id ON public.players USING btree (team_id);


--
-- Name: idx_purchases_recording; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_recording ON public.stream_purchases USING btree (recording_id) WHERE (recording_id IS NOT NULL);


--
-- Name: idx_purchases_stream; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_stream ON public.stream_purchases USING btree (stream_id) WHERE (stream_id IS NOT NULL);


--
-- Name: idx_purchases_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_purchases_user ON public.stream_purchases USING btree (user_id);


--
-- Name: idx_rate_limits_user_window; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_user_window ON public.agent_rate_limits USING btree (user_identifier, window_end);


--
-- Name: idx_reactions_clip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_clip ON public.content_reactions USING btree (clip_id) WHERE (clip_id IS NOT NULL);


--
-- Name: idx_reactions_recording; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_recording ON public.content_reactions USING btree (recording_id) WHERE (recording_id IS NOT NULL);


--
-- Name: idx_reactions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactions_user ON public.content_reactions USING btree (user_id);


--
-- Name: idx_recordings_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_created_at ON public.match_recordings USING btree (created_at DESC);


--
-- Name: idx_recordings_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_league ON public.match_recordings USING btree (league_id);


--
-- Name: idx_recordings_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_match ON public.match_recordings USING btree (match_id);


--
-- Name: idx_recordings_mux_asset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_mux_asset ON public.match_recordings USING btree (mux_asset_id) WHERE (mux_asset_id IS NOT NULL);


--
-- Name: idx_recordings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_status ON public.match_recordings USING btree (status);


--
-- Name: idx_recordings_tournament; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_tournament ON public.match_recordings USING btree (tournament_id);


--
-- Name: idx_recordings_views; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_views ON public.match_recordings USING btree (views_count DESC);


--
-- Name: idx_recordings_visibility; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordings_visibility ON public.match_recordings USING btree (visibility) WHERE (visibility = 'public'::text);


--
-- Name: idx_streams_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_league ON public.live_streams USING btree (league_id);


--
-- Name: idx_streams_match; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_match ON public.live_streams USING btree (match_id);


--
-- Name: idx_streams_mux_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_mux_id ON public.live_streams USING btree (mux_live_stream_id) WHERE (mux_live_stream_id IS NOT NULL);


--
-- Name: idx_streams_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_scheduled ON public.live_streams USING btree (scheduled_start);


--
-- Name: idx_streams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_streams_status ON public.live_streams USING btree (status);


--
-- Name: idx_suspension_match_applications_match_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_match_applications_match_id ON public.suspension_match_applications USING btree (match_id);


--
-- Name: idx_suspension_match_applications_suspension_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suspension_match_applications_suspension_id ON public.suspension_match_applications USING btree (suspension_id);


--
-- Name: idx_team_stats_goal_difference; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_goal_difference ON public.team_stats USING btree (goal_difference);


--
-- Name: idx_team_stats_last_match_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_last_match_date ON public.team_stats USING btree (last_match_date);


--
-- Name: idx_team_stats_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_league_id ON public.team_stats USING btree (league_id);


--
-- Name: idx_team_stats_league_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_league_points ON public.team_stats USING btree (league_id, points DESC, goal_difference DESC);


--
-- Name: idx_team_stats_matches_played; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_matches_played ON public.team_stats USING btree (matches_played);


--
-- Name: idx_team_stats_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_points ON public.team_stats USING btree (points);


--
-- Name: idx_team_stats_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_team_id ON public.team_stats USING btree (team_id);


--
-- Name: idx_team_stats_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_tournament_id ON public.team_stats USING btree (tournament_id);


--
-- Name: idx_team_stats_tournament_points; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_stats_tournament_points ON public.team_stats USING btree (tournament_id, points DESC, goal_difference DESC);


--
-- Name: idx_teams_alt1_shorts_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_alt1_shorts_color ON public.teams USING btree (alt1_shorts_color);


--
-- Name: idx_teams_alt2_shorts_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_alt2_shorts_color ON public.teams USING btree (alt2_shorts_color);


--
-- Name: idx_teams_away_primary_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_away_primary_color ON public.teams USING btree (away_primary_color);


--
-- Name: idx_teams_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_created_at ON public.teams USING btree (created_at);


--
-- Name: idx_teams_group_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_group_name ON public.teams USING btree (group_name);


--
-- Name: idx_teams_home_primary_color; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_home_primary_color ON public.teams USING btree (home_primary_color);


--
-- Name: idx_teams_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_is_active ON public.teams USING btree (is_active);


--
-- Name: idx_teams_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_league_id ON public.teams USING btree (league_id);


--
-- Name: idx_teams_owner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_owner_id ON public.teams USING btree (owner_id);


--
-- Name: idx_teams_slug_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_slug_league_id ON public.teams USING btree (slug, league_id);


--
-- Name: idx_teams_tournament_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_tournament_group ON public.teams USING btree (tournament_id, group_name);


--
-- Name: idx_teams_tournament_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_teams_tournament_id ON public.teams USING btree (tournament_id);


--
-- Name: idx_tournaments_age_validation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_age_validation ON public.tournaments USING btree (age_validation_enabled) WHERE (age_validation_enabled = true);


--
-- Name: idx_tournaments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_created_at ON public.tournaments USING btree (created_at);


--
-- Name: idx_tournaments_end_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_end_date ON public.tournaments USING btree (end_date);


--
-- Name: idx_tournaments_format; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_format ON public.tournaments USING btree (tournament_format);


--
-- Name: idx_tournaments_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_is_active ON public.tournaments USING btree (is_active);


--
-- Name: idx_tournaments_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_league_id ON public.tournaments USING btree (league_id);


--
-- Name: idx_tournaments_start_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tournaments_start_date ON public.tournaments USING btree (start_date);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_league_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_league_id ON public.users USING btree (league_id);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_team_id ON public.users USING btree (team_id);


--
-- Name: idx_whatsapp_links_league; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_links_league ON public.whatsapp_user_links USING btree (league_id);


--
-- Name: idx_whatsapp_links_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_links_phone ON public.whatsapp_user_links USING btree (phone_number) WHERE (is_active = true);


--
-- Name: idx_whatsapp_links_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_whatsapp_links_user ON public.whatsapp_user_links USING btree (user_id);


--
-- Name: users on_auth_user_created; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


--
-- Name: users on_auth_user_updated; Type: TRIGGER; Schema: auth; Owner: -
--

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();


--
-- Name: finance_config finance_config_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER finance_config_updated BEFORE UPDATE ON public.finance_config FOR EACH ROW EXECUTE FUNCTION public.update_finance_timestamp();


--
-- Name: finance_transactions finance_transactions_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER finance_transactions_updated BEFORE UPDATE ON public.finance_transactions FOR EACH ROW EXECUTE FUNCTION public.update_finance_timestamp();


--
-- Name: leagues on_finance_feature_enabled; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_finance_feature_enabled AFTER UPDATE OF features ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.create_default_finance_config();


--
-- Name: coaching_staff set_coaching_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_coaching_staff_updated_at BEFORE UPDATE ON public.coaching_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_stats sync_player_stats_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_player_stats_trigger AFTER INSERT OR UPDATE ON public.player_stats FOR EACH ROW EXECUTE FUNCTION public.sync_player_stats_to_cedula();


--
-- Name: match_cards trigger_create_suspension_for_red_card; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_create_suspension_for_red_card AFTER INSERT ON public.match_cards FOR EACH ROW EXECUTE FUNCTION public.create_suspension_for_red_card();


--
-- Name: leagues trigger_set_default_features; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_default_features BEFORE INSERT OR UPDATE OF product_mode ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.set_default_features_for_mode();


--
-- Name: asistencias_qr trigger_sync_qr_to_player_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_qr_to_player_stats AFTER INSERT ON public.asistencias_qr FOR EACH ROW EXECUTE FUNCTION public.sync_qr_to_player_stats();


--
-- Name: matches trigger_update_knowledge_on_match_finish; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_knowledge_on_match_finish AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.auto_update_knowledge_base_on_match_finish();


--
-- Name: player_registration_requests trigger_update_player_registration_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_player_registration_requests_updated_at BEFORE UPDATE ON public.player_registration_requests FOR EACH ROW EXECUTE FUNCTION public.update_player_registration_requests_updated_at();


--
-- Name: facial_attendance trigger_update_team_attendance_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_team_attendance_stats AFTER INSERT ON public.facial_attendance FOR EACH ROW EXECUTE FUNCTION public.update_team_attendance_stats();


--
-- Name: player_stats trigger_update_team_cards_from_player_stats; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_team_cards_from_player_stats AFTER INSERT OR UPDATE ON public.player_stats FOR EACH ROW EXECUTE FUNCTION public.update_team_cards_from_player_stats();


--
-- Name: matches trigger_update_team_stats_after_match; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_team_stats_after_match AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_team_stats_after_match();


--
-- Name: agent_conversations trigger_update_whatsapp_interaction; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_whatsapp_interaction AFTER INSERT ON public.agent_conversations FOR EACH ROW WHEN ((new.channel = 'whatsapp'::text)) EXECUTE FUNCTION public.update_whatsapp_last_interaction();


--
-- Name: asistencias_qr update_asistencias_qr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asistencias_qr_updated_at BEFORE UPDATE ON public.asistencias_qr FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: leagues update_leagues_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_leagues_updated_at BEFORE UPDATE ON public.leagues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: match_recordings update_match_recordings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_match_recordings_updated_at BEFORE UPDATE ON public.match_recordings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: matches update_matches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: player_stats update_player_stats_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_player_stats_updated_at BEFORE UPDATE ON public.player_stats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: players update_players_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON public.players FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tournaments update_tournaments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agent_actions agent_actions_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_actions
    ADD CONSTRAINT agent_actions_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.agent_conversations(id) ON DELETE CASCADE;


--
-- Name: agent_conversations agent_conversations_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id);


--
-- Name: agent_conversations agent_conversations_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id);


--
-- Name: agent_conversations agent_conversations_whatsapp_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_conversations
    ADD CONSTRAINT agent_conversations_whatsapp_link_id_fkey FOREIGN KEY (whatsapp_link_id) REFERENCES public.whatsapp_user_links(id);


--
-- Name: asistencias_qr asistencias_qr_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias_qr
    ADD CONSTRAINT asistencias_qr_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: asistencias_qr asistencias_qr_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asistencias_qr
    ADD CONSTRAINT asistencias_qr_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: coaching_staff coaching_staff_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coaching_staff
    ADD CONSTRAINT coaching_staff_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: content_reactions content_reactions_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reactions
    ADD CONSTRAINT content_reactions_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.video_clips(id) ON DELETE CASCADE;


--
-- Name: content_reactions content_reactions_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reactions
    ADD CONSTRAINT content_reactions_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.match_recordings(id) ON DELETE CASCADE;


--
-- Name: content_reactions content_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.content_reactions
    ADD CONSTRAINT content_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: facial_attendance facial_attendance_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facial_attendance
    ADD CONSTRAINT facial_attendance_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: facial_attendance facial_attendance_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facial_attendance
    ADD CONSTRAINT facial_attendance_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: finance_config finance_config_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: finance_config finance_config_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: finance_config finance_config_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: finance_config finance_config_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_config
    ADD CONSTRAINT finance_config_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: finance_transactions finance_transactions_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.users(id);


--
-- Name: finance_transactions finance_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: finance_transactions finance_transactions_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: finance_transactions finance_transactions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_parent_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_parent_transaction_id_fkey FOREIGN KEY (parent_transaction_id) REFERENCES public.finance_transactions(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: finance_transactions finance_transactions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.finance_transactions
    ADD CONSTRAINT finance_transactions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);


--
-- Name: league_knowledge_base league_knowledge_base_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_knowledge_base
    ADD CONSTRAINT league_knowledge_base_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: league_knowledge_base league_knowledge_base_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_knowledge_base
    ADD CONSTRAINT league_knowledge_base_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: league_knowledge_base league_knowledge_base_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.league_knowledge_base
    ADD CONSTRAINT league_knowledge_base_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: leagues leagues_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: leagues leagues_mode_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leagues
    ADD CONSTRAINT leagues_mode_updated_by_fkey FOREIGN KEY (mode_updated_by) REFERENCES public.users(id);


--
-- Name: live_streams live_streams_broadcaster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_broadcaster_id_fkey FOREIGN KEY (broadcaster_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: live_streams live_streams_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.live_streams
    ADD CONSTRAINT live_streams_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.match_recordings(id) ON DELETE SET NULL;


--
-- Name: match_cards match_cards_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_cards
    ADD CONSTRAINT match_cards_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_cards match_cards_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_cards
    ADD CONSTRAINT match_cards_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_cards match_cards_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_cards
    ADD CONSTRAINT match_cards_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: match_goals match_goals_assist_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_goals
    ADD CONSTRAINT match_goals_assist_player_id_fkey FOREIGN KEY (assist_player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_goals match_goals_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_goals
    ADD CONSTRAINT match_goals_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_goals match_goals_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_goals
    ADD CONSTRAINT match_goals_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: match_goals match_goals_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_goals
    ADD CONSTRAINT match_goals_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: match_incidents match_incidents_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_incidents
    ADD CONSTRAINT match_incidents_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: match_incidents match_incidents_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_incidents
    ADD CONSTRAINT match_incidents_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: match_incidents match_incidents_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_incidents
    ADD CONSTRAINT match_incidents_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: match_recordings match_recordings_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_recordings
    ADD CONSTRAINT match_recordings_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;


--
-- Name: match_recordings match_recordings_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_recordings
    ADD CONSTRAINT match_recordings_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: match_recordings match_recordings_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_recordings
    ADD CONSTRAINT match_recordings_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: match_recordings match_recordings_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_recordings
    ADD CONSTRAINT match_recordings_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: match_referee_reports match_referee_reports_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_referee_reports
    ADD CONSTRAINT match_referee_reports_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: matches matches_away_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_away_team_id_fkey FOREIGN KEY (away_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: matches matches_bye_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_bye_team_id_fkey FOREIGN KEY (bye_team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: matches matches_home_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_home_team_id_fkey FOREIGN KEY (home_team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: matches matches_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: player_registration_requests player_registration_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_registration_requests
    ADD CONSTRAINT player_registration_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: player_registration_requests player_registration_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_registration_requests
    ADD CONSTRAINT player_registration_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: player_registration_requests player_registration_requests_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_registration_requests
    ADD CONSTRAINT player_registration_requests_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: player_registration_requests player_registration_requests_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_registration_requests
    ADD CONSTRAINT player_registration_requests_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: player_stats player_stats_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_stats
    ADD CONSTRAINT player_stats_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_suspensions player_suspensions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: player_suspensions player_suspensions_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: player_suspensions player_suspensions_match_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_match_card_id_fkey FOREIGN KEY (match_card_id) REFERENCES public.match_cards(id) ON DELETE SET NULL;


--
-- Name: player_suspensions player_suspensions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: player_suspensions player_suspensions_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: player_suspensions player_suspensions_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: player_suspensions player_suspensions_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: player_suspensions player_suspensions_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_suspensions
    ADD CONSTRAINT player_suspensions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: players players_id_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_id_verified_by_fkey FOREIGN KEY (id_verified_by) REFERENCES public.users(id);


--
-- Name: players players_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.players
    ADD CONSTRAINT players_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: stream_chat stream_chat_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_chat
    ADD CONSTRAINT stream_chat_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stream_chat stream_chat_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_chat
    ADD CONSTRAINT stream_chat_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.live_streams(id) ON DELETE CASCADE;


--
-- Name: stream_chat stream_chat_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_chat
    ADD CONSTRAINT stream_chat_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: stream_purchases stream_purchases_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_purchases
    ADD CONSTRAINT stream_purchases_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.match_recordings(id) ON DELETE SET NULL;


--
-- Name: stream_purchases stream_purchases_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_purchases
    ADD CONSTRAINT stream_purchases_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.live_streams(id) ON DELETE SET NULL;


--
-- Name: stream_purchases stream_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_purchases
    ADD CONSTRAINT stream_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: suspension_match_applications suspension_match_applications_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_match_applications
    ADD CONSTRAINT suspension_match_applications_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE;


--
-- Name: suspension_match_applications suspension_match_applications_suspension_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suspension_match_applications
    ADD CONSTRAINT suspension_match_applications_suspension_id_fkey FOREIGN KEY (suspension_id) REFERENCES public.player_suspensions(id) ON DELETE CASCADE;


--
-- Name: team_stats team_stats_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_stats
    ADD CONSTRAINT team_stats_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: team_stats team_stats_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_stats
    ADD CONSTRAINT team_stats_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_stats team_stats_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_stats
    ADD CONSTRAINT team_stats_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;


--
-- Name: teams teams_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: teams teams_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: teams teams_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: tournaments tournaments_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tournaments
    ADD CONSTRAINT tournaments_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: user_follows user_follows_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_follows
    ADD CONSTRAINT user_follows_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: users users_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;


--
-- Name: users users_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: video_clips video_clips_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: video_clips video_clips_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE SET NULL;


--
-- Name: video_clips video_clips_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE SET NULL;


--
-- Name: video_clips video_clips_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.players(id) ON DELETE SET NULL;


--
-- Name: video_clips video_clips_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.match_recordings(id) ON DELETE CASCADE;


--
-- Name: video_clips video_clips_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_clips
    ADD CONSTRAINT video_clips_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;


--
-- Name: watch_history watch_history_clip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_clip_id_fkey FOREIGN KEY (clip_id) REFERENCES public.video_clips(id) ON DELETE CASCADE;


--
-- Name: watch_history watch_history_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_recording_id_fkey FOREIGN KEY (recording_id) REFERENCES public.match_recordings(id) ON DELETE CASCADE;


--
-- Name: watch_history watch_history_stream_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_stream_id_fkey FOREIGN KEY (stream_id) REFERENCES public.live_streams(id) ON DELETE CASCADE;


--
-- Name: watch_history watch_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watch_history
    ADD CONSTRAINT watch_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: whatsapp_user_links whatsapp_user_links_league_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_user_links
    ADD CONSTRAINT whatsapp_user_links_league_id_fkey FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;


--
-- Name: whatsapp_user_links whatsapp_user_links_tournament_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_user_links
    ADD CONSTRAINT whatsapp_user_links_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE SET NULL;


--
-- Name: whatsapp_user_links whatsapp_user_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_user_links
    ADD CONSTRAINT whatsapp_user_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: video_clips Admins can manage clips; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage clips" ON public.video_clips USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role]))))));


--
-- Name: match_recordings Admins can manage recordings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage recordings" ON public.match_recordings USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role]))))));


--
-- Name: live_streams Admins can manage streams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage streams" ON public.live_streams USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role]))))));


--
-- Name: stream_purchases Admins can view all purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all purchases" ON public.stream_purchases FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role]))))));


--
-- Name: agent_conversations Admins can view conversations in their context; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view conversations in their context" ON public.agent_conversations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'super_admin'::public.user_role) OR ((users.role = 'league_admin'::public.user_role) AND (users.league_id = agent_conversations.league_id)))))));


--
-- Name: users Allow public access to users table; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Allow public access to users table" ON public.users FOR SELECT USING (true);


--
-- Name: league_knowledge_base Anyone can read knowledge base; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read knowledge base" ON public.league_knowledge_base FOR SELECT USING (true);


--
-- Name: leagues Anyone can view active leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active leagues" ON public.leagues FOR SELECT USING ((is_active = true));


--
-- Name: players Anyone can view active players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active players" ON public.players FOR SELECT USING (((is_active = true) AND (EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = players.team_id) AND (teams.is_active = true))))));


--
-- Name: teams Anyone can view active teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active teams" ON public.teams FOR SELECT USING ((is_active = true));


--
-- Name: matches Anyone can view matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view matches" ON public.matches FOR SELECT USING (true);


--
-- Name: player_stats Anyone can view player stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view player stats" ON public.player_stats FOR SELECT USING (true);


--
-- Name: tournaments Anyone can view tournaments of active leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view tournaments of active leagues" ON public.tournaments FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leagues
  WHERE ((leagues.id = tournaments.league_id) AND (leagues.is_active = true)))));


--
-- Name: leagues Authenticated users can create leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create leagues" ON public.leagues FOR INSERT WITH CHECK (((auth.uid() = admin_id) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role])))))));


--
-- Name: teams Authenticated users can create teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create teams" ON public.teams FOR INSERT WITH CHECK (((auth.uid() = owner_id) AND (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['super_admin'::public.user_role, 'league_admin'::public.user_role, 'team_owner'::public.user_role])))))));


--
-- Name: stream_chat Authenticated users can send messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can send messages" ON public.stream_chat FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: stream_chat Chat is viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Chat is viewable by everyone" ON public.stream_chat FOR SELECT USING (true);


--
-- Name: whatsapp_message_templates Everyone can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Everyone can view active templates" ON public.whatsapp_message_templates FOR SELECT USING ((is_active = true));


--
-- Name: facial_attendance Facial attendance only for full mode leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Facial attendance only for full mode leagues" ON public.facial_attendance USING ((EXISTS ( SELECT 1
   FROM ((public.leagues l
     JOIN public.tournaments t ON ((t.league_id = l.id)))
     JOIN public.matches m ON ((m.tournament_id = t.id)))
  WHERE ((m.id = facial_attendance.match_id) AND (l.product_mode = 'full'::text)))));


--
-- Name: facial_attendance League admins can insert attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can insert attendance" ON public.facial_attendance FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
     JOIN public.users u ON ((u.league_id = l.id)))
  WHERE ((m.id = facial_attendance.match_id) AND (u.id = auth.uid()) AND (u.role = 'league_admin'::public.user_role)))));


--
-- Name: match_referee_reports League admins can insert/update match referee reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can insert/update match referee reports" ON public.match_referee_reports USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_referee_reports.match_id) AND (l.admin_id = auth.uid())))));


--
-- Name: match_cards League admins can manage match cards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage match cards" ON public.match_cards USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_cards.match_id) AND (l.admin_id = auth.uid())))));


--
-- Name: match_goals League admins can manage match goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage match goals" ON public.match_goals USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_goals.match_id) AND (l.admin_id = auth.uid())))));


--
-- Name: match_incidents League admins can manage match incidents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage match incidents" ON public.match_incidents USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_incidents.match_id) AND (l.admin_id = auth.uid())))));


--
-- Name: matches League admins can manage matches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage matches" ON public.matches USING (((EXISTS ( SELECT 1
   FROM (public.tournaments t
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((t.id = matches.tournament_id) AND (l.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: player_stats League admins can manage player stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage player stats" ON public.player_stats USING (((EXISTS ( SELECT 1
   FROM ((public.players p
     JOIN public.teams t ON ((p.team_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((p.id = player_stats.player_id) AND (l.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: suspension_match_applications League admins can manage suspension applications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage suspension applications" ON public.suspension_match_applications USING ((EXISTS ( SELECT 1
   FROM (public.player_suspensions ps
     JOIN public.leagues l ON ((ps.league_id = l.id)))
  WHERE ((ps.id = suspension_match_applications.suspension_id) AND (l.admin_id = auth.uid())))));


--
-- Name: player_suspensions League admins can manage suspensions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage suspensions" ON public.player_suspensions USING ((EXISTS ( SELECT 1
   FROM public.leagues l
  WHERE ((l.id = player_suspensions.league_id) AND (l.admin_id = auth.uid())))));


--
-- Name: team_stats League admins can manage team stats in their league; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage team stats in their league" ON public.team_stats USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'league_admin'::public.user_role) AND (u.league_id = team_stats.league_id)))));


--
-- Name: league_knowledge_base League admins can manage their knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage their knowledge" ON public.league_knowledge_base USING ((EXISTS ( SELECT 1
   FROM public.leagues l
  WHERE ((l.id = league_knowledge_base.league_id) AND (l.admin_id = auth.uid())))));


--
-- Name: leagues League admins can manage their leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage their leagues" ON public.leagues USING (((auth.uid() = admin_id) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: tournaments League admins can manage tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can manage tournaments" ON public.tournaments USING (((EXISTS ( SELECT 1
   FROM public.leagues
  WHERE ((leagues.id = tournaments.league_id) AND (leagues.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: whatsapp_user_links League admins can view links in their league; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "League admins can view links in their league" ON public.whatsapp_user_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND ((users.role = 'super_admin'::public.user_role) OR ((users.role = 'league_admin'::public.user_role) AND (users.league_id = whatsapp_user_links.league_id)))))));


--
-- Name: team_stats Public can view team stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view team stats" ON public.team_stats FOR SELECT USING (true);


--
-- Name: video_clips Public clips are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public clips are viewable by everyone" ON public.video_clips FOR SELECT USING (true);


--
-- Name: match_recordings Public recordings are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public recordings are viewable by everyone" ON public.match_recordings FOR SELECT USING ((visibility = ANY (ARRAY['public'::text, 'unlisted'::text])));


--
-- Name: asistencias_qr QR attendance only for full mode leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "QR attendance only for full mode leagues" ON public.asistencias_qr USING ((EXISTS ( SELECT 1
   FROM ((public.leagues l
     JOIN public.tournaments t ON ((t.league_id = l.id)))
     JOIN public.matches m ON ((m.tournament_id = t.id)))
  WHERE ((m.id = asistencias_qr.match_id) AND (l.product_mode = 'full'::text)))));


--
-- Name: live_streams Streams are viewable by everyone; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Streams are viewable by everyone" ON public.live_streams FOR SELECT USING (true);


--
-- Name: league_knowledge_base Super admins can manage all knowledge; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all knowledge" ON public.league_knowledge_base USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'super_admin'::public.user_role)))));


--
-- Name: team_stats Super admins can manage all team stats; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all team stats" ON public.team_stats USING ((EXISTS ( SELECT 1
   FROM public.users u
  WHERE ((u.id = auth.uid()) AND (u.role = 'super_admin'::public.user_role)))));


--
-- Name: users Super admins can manage all users; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage all users" ON public.users USING ((((auth.jwt() ->> 'role'::text) = 'authenticated'::text) AND (EXISTS ( SELECT 1
   FROM auth.users users_1
  WHERE ((auth.uid() = users_1.id) AND ((users_1.raw_user_meta_data ->> 'role'::text) = 'super_admin'::text))))));


--
-- Name: whatsapp_message_templates Super admins can manage templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage templates" ON public.whatsapp_message_templates USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role)))));


--
-- Name: whatsapp_user_links Super admins can view all WhatsApp links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can view all WhatsApp links" ON public.whatsapp_user_links FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role)))));


--
-- Name: players Team owners can manage their players; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage their players" ON public.players USING (((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = players.team_id) AND (teams.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (public.teams t
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((t.id = players.team_id) AND (l.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: teams Team owners can manage their teams; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can manage their teams" ON public.teams USING (((auth.uid() = owner_id) OR (EXISTS ( SELECT 1
   FROM public.leagues
  WHERE ((leagues.id = teams.league_id) AND (leagues.admin_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM public.users
  WHERE ((users.id = auth.uid()) AND (users.role = 'super_admin'::public.user_role))))));


--
-- Name: facial_attendance Team owners can view their team's attendance; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team owners can view their team's attendance" ON public.facial_attendance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.players p
     JOIN public.teams tm ON ((p.team_id = tm.id)))
     JOIN public.users u ON ((u.team_id = tm.id)))
  WHERE ((p.id = facial_attendance.player_id) AND (u.id = auth.uid())))));


--
-- Name: user_follows Users can manage their follows; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their follows" ON public.user_follows USING ((user_id = auth.uid()));


--
-- Name: content_reactions Users can manage their reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their reactions" ON public.content_reactions USING ((user_id = auth.uid()));


--
-- Name: watch_history Users can manage their watch history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their watch history" ON public.watch_history USING ((user_id = auth.uid()));


--
-- Name: users Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.users FOR UPDATE USING ((auth.uid() = id));


--
-- Name: facial_attendance Users can view facial attendance for their league; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view facial attendance for their league" ON public.facial_attendance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
     JOIN public.users u ON ((u.league_id = l.id)))
  WHERE ((m.id = facial_attendance.match_id) AND (u.id = auth.uid())))));


--
-- Name: match_cards Users can view match cards for accessible tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view match cards for accessible tournaments" ON public.match_cards FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_cards.match_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams team
          WHERE (((team.id = m.home_team_id) OR (team.id = m.away_team_id)) AND (team.owner_id = auth.uid())))))))));


--
-- Name: match_goals Users can view match goals for accessible tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view match goals for accessible tournaments" ON public.match_goals FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_goals.match_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams team
          WHERE (((team.id = m.home_team_id) OR (team.id = m.away_team_id)) AND (team.owner_id = auth.uid())))))))));


--
-- Name: match_incidents Users can view match incidents for accessible tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view match incidents for accessible tournaments" ON public.match_incidents FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_incidents.match_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams team
          WHERE (((team.id = m.home_team_id) OR (team.id = m.away_team_id)) AND (team.owner_id = auth.uid())))))))));


--
-- Name: match_referee_reports Users can view match referee reports for accessible tournaments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view match referee reports for accessible tournaments" ON public.match_referee_reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ((public.matches m
     JOIN public.tournaments t ON ((m.tournament_id = t.id)))
     JOIN public.leagues l ON ((t.league_id = l.id)))
  WHERE ((m.id = match_referee_reports.match_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams team
          WHERE (((team.id = m.home_team_id) OR (team.id = m.away_team_id)) AND (team.owner_id = auth.uid())))))))));


--
-- Name: suspension_match_applications Users can view suspension applications for accessible leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view suspension applications for accessible leagues" ON public.suspension_match_applications FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.player_suspensions ps
     JOIN public.leagues l ON ((ps.league_id = l.id)))
  WHERE ((ps.id = suspension_match_applications.suspension_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams t
          WHERE ((t.id = ps.team_id) AND (t.owner_id = auth.uid())))))))));


--
-- Name: player_suspensions Users can view suspensions for accessible leagues; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view suspensions for accessible leagues" ON public.player_suspensions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.leagues l
  WHERE ((l.id = player_suspensions.league_id) AND ((l.admin_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.teams t
          WHERE ((t.id = player_suspensions.team_id) AND (t.owner_id = auth.uid())))))))));


--
-- Name: whatsapp_user_links Users can view their own WhatsApp links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own WhatsApp links" ON public.whatsapp_user_links FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: users Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.users FOR SELECT USING ((auth.uid() = id));


--
-- Name: stream_purchases Users can view their purchases; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their purchases" ON public.stream_purchases FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: agent_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: agent_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agent_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: asistencias_qr; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.asistencias_qr ENABLE ROW LEVEL SECURITY;

--
-- Name: coaching_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coaching_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: coaching_staff coaching_staff_delete_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaching_staff_delete_policy ON public.coaching_staff FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = coaching_staff.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: coaching_staff coaching_staff_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaching_staff_insert_policy ON public.coaching_staff FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = coaching_staff.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: coaching_staff coaching_staff_public_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaching_staff_public_select_policy ON public.coaching_staff FOR SELECT USING (true);


--
-- Name: coaching_staff coaching_staff_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaching_staff_update_policy ON public.coaching_staff FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.teams
  WHERE ((teams.id = coaching_staff.team_id) AND (teams.owner_id = auth.uid())))));


--
-- Name: content_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: facial_attendance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facial_attendance ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_config ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_config finance_config_access_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY finance_config_access_policy ON public.finance_config USING ((EXISTS ( SELECT 1
   FROM public.leagues l
  WHERE ((l.id = finance_config.league_id) AND (((l.features ->> 'finance'::text))::boolean = true)))));


--
-- Name: finance_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: finance_transactions finance_transactions_access_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY finance_transactions_access_policy ON public.finance_transactions USING ((EXISTS ( SELECT 1
   FROM public.leagues l
  WHERE ((l.id = finance_transactions.league_id) AND (((l.features ->> 'finance'::text))::boolean = true)))));


--
-- Name: league_knowledge_base; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.league_knowledge_base ENABLE ROW LEVEL SECURITY;

--
-- Name: leagues; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

--
-- Name: live_streams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

--
-- Name: match_cards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_cards ENABLE ROW LEVEL SECURITY;

--
-- Name: match_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: match_incidents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_incidents ENABLE ROW LEVEL SECURITY;

--
-- Name: match_recordings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_recordings ENABLE ROW LEVEL SECURITY;

--
-- Name: match_referee_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.match_referee_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: matches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

--
-- Name: player_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: player_suspensions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.player_suspensions ENABLE ROW LEVEL SECURITY;

--
-- Name: players; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_chat; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_chat ENABLE ROW LEVEL SECURITY;

--
-- Name: stream_purchases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stream_purchases ENABLE ROW LEVEL SECURITY;

--
-- Name: suspension_match_applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suspension_match_applications ENABLE ROW LEVEL SECURITY;

--
-- Name: team_stats; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.team_stats ENABLE ROW LEVEL SECURITY;

--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: tournaments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

--
-- Name: user_follows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: video_clips; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;

--
-- Name: watch_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_conversation_windows; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_conversation_windows ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_message_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_message_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_user_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_user_links ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict utkhCBUwLRI1bRLXFIJul5W1q8zIgng6X4xGgiZY9823PjgA1lh8OXZNdSaNFs3

