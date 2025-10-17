-- Migrar datos de player_stats a las tablas de cédula arbitral (match_goals y match_cards)
-- Migration: 20250912000002_migrate_player_stats_to_cedula.sql

-- Función para migrar estadísticas de jugadores a tablas detalladas de cédula arbitral
CREATE OR REPLACE FUNCTION migrate_player_stats_to_cedula_tables()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Ejecutar la migración
SELECT migrate_player_stats_to_cedula_tables();

-- Crear función para mantener sincronizadas las tablas
CREATE OR REPLACE FUNCTION sync_player_stats_to_cedula()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Crear trigger para mantener sincronización automática
DROP TRIGGER IF EXISTS sync_player_stats_trigger ON player_stats;
CREATE TRIGGER sync_player_stats_trigger
    AFTER INSERT OR UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION sync_player_stats_to_cedula();

-- Comentario sobre la estrategia
COMMENT ON FUNCTION sync_player_stats_to_cedula() IS
'Función que mantiene sincronizadas las estadísticas de player_stats con las tablas detalladas de cédula arbitral (match_goals y match_cards). Se ejecuta automáticamente cuando se insertan o actualizan estadísticas.';

COMMENT ON TRIGGER sync_player_stats_trigger ON player_stats IS
'Trigger que sincroniza automáticamente los cambios en player_stats con las tablas de cédula arbitral para mantener consistencia de datos.';