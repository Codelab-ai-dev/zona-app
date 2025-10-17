-- Script para crear datos de ejemplo para el partido Madrid vs Valladolid
-- Buscar el partido específico y crear cédula arbitral

-- Primero buscar el partido Madrid vs Valladolid
DO $$
DECLARE
    match_record RECORD;
    madrid_team_id UUID;
    valladolid_team_id UUID;
    madrid_player1_id UUID;
    madrid_player2_id UUID;
    valladolid_player1_id UUID;
    valladolid_player2_id UUID;
BEGIN
    -- Buscar equipos Madrid y Valladolid
    SELECT id INTO madrid_team_id FROM teams WHERE LOWER(name) LIKE '%madrid%' LIMIT 1;
    SELECT id INTO valladolid_team_id FROM teams WHERE LOWER(name) LIKE '%valladolid%' LIMIT 1;

    IF madrid_team_id IS NULL OR valladolid_team_id IS NULL THEN
        RAISE NOTICE 'No se encontraron equipos Madrid o Valladolid';
        RETURN;
    END IF;

    -- Buscar el partido donde Madrid perdió 2-0
    SELECT * INTO match_record
    FROM matches m
    WHERE (
        (m.home_team_id = madrid_team_id AND m.away_team_id = valladolid_team_id AND m.home_score = 0 AND m.away_score = 2)
        OR
        (m.home_team_id = valladolid_team_id AND m.away_team_id = madrid_team_id AND m.home_score = 2 AND m.away_score = 0)
    )
    AND m.status = 'finished'
    LIMIT 1;

    IF match_record.id IS NULL THEN
        RAISE NOTICE 'No se encontró el partido Madrid vs Valladolid 0-2';
        RETURN;
    END IF;

    RAISE NOTICE 'Partido encontrado: %', match_record.id;

    -- Verificar si ya existe reporte de árbitro
    IF EXISTS (SELECT 1 FROM match_referee_reports WHERE match_id = match_record.id) THEN
        RAISE NOTICE 'Ya existe reporte de árbitro para este partido';
    ELSE
        -- Crear reporte de árbitro
        INSERT INTO match_referee_reports (
            match_id,
            referee_name,
            assistant_referee_1,
            assistant_referee_2,
            fourth_official,
            general_observations,
            weather_conditions,
            field_conditions,
            created_at,
            updated_at
        ) VALUES (
            match_record.id,
            'Carlos Rodríguez',
            'Luis García',
            'Miguel López',
            'Antonio Martín',
            'Partido disputado con intensidad. El equipo visitante demostró mejor efectividad en el área rival. Se destacó la disciplina de ambos equipos durante el encuentro.',
            'Soleado, 22°C',
            'Césped en excelentes condiciones',
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Reporte de árbitro creado';
    END IF;

    -- Obtener algunos jugadores para crear goles y tarjetas
    SELECT id INTO valladolid_player1_id
    FROM players
    WHERE team_id = valladolid_team_id AND is_active = true
    LIMIT 1;

    SELECT id INTO valladolid_player2_id
    FROM players
    WHERE team_id = valladolid_team_id AND is_active = true AND id != valladolid_player1_id
    LIMIT 1;

    SELECT id INTO madrid_player1_id
    FROM players
    WHERE team_id = madrid_team_id AND is_active = true
    LIMIT 1;

    -- Crear goles si no existen
    IF NOT EXISTS (SELECT 1 FROM match_goals WHERE match_id = match_record.id) THEN
        -- Primer gol de Valladolid (minuto 23)
        IF valladolid_player1_id IS NOT NULL THEN
            INSERT INTO match_goals (
                match_id,
                player_id,
                team_id,
                minute,
                goal_type,
                description,
                created_at
            ) VALUES (
                match_record.id,
                valladolid_player1_id,
                valladolid_team_id,
                23,
                'normal',
                'Gol tras centro desde la banda derecha',
                NOW()
            );
            RAISE NOTICE 'Primer gol creado';
        END IF;

        -- Segundo gol de Valladolid (minuto 67)
        IF valladolid_player2_id IS NOT NULL THEN
            INSERT INTO match_goals (
                match_id,
                player_id,
                team_id,
                minute,
                goal_type,
                description,
                created_at
            ) VALUES (
                match_record.id,
                valladolid_player2_id,
                valladolid_team_id,
                67,
                'normal',
                'Gol de cabeza tras córner',
                NOW()
            );
            RAISE NOTICE 'Segundo gol creado';
        END IF;
    END IF;

    -- Crear tarjetas si no existen
    IF NOT EXISTS (SELECT 1 FROM match_cards WHERE match_id = match_record.id) THEN
        -- Tarjeta amarilla a jugador de Madrid
        IF madrid_player1_id IS NOT NULL THEN
            INSERT INTO match_cards (
                match_id,
                player_id,
                team_id,
                card_type,
                minute,
                reason,
                created_at
            ) VALUES (
                match_record.id,
                madrid_player1_id,
                madrid_team_id,
                'yellow',
                34,
                'Falta por entrada fuerte',
                NOW()
            );
            RAISE NOTICE 'Tarjeta amarilla creada';
        END IF;
    END IF;

    -- Crear incidencias si no existen
    IF NOT EXISTS (SELECT 1 FROM match_incidents WHERE match_id = match_record.id) THEN
        INSERT INTO match_incidents (
            match_id,
            minute,
            incident_type,
            description,
            created_at
        ) VALUES
        (
            match_record.id,
            45,
            'Lesión',
            'Jugador del equipo local requirió atención médica por golpe en el tobillo',
            NOW()
        ),
        (
            match_record.id,
            78,
            'Cambio técnico',
            'Triple cambio del equipo visitante para mantener el resultado',
            NOW()
        );
        RAISE NOTICE 'Incidencias creadas';
    END IF;

    RAISE NOTICE 'Cédula arbitral completada para el partido %', match_record.id;

END $$;