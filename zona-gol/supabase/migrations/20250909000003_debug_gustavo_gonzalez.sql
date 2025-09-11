-- Migration: Debug Gustavo González data
-- Date: 2025-09-09
-- Description: Check what tables exist and find Gustavo González data

DO $$
DECLARE
    table_exists BOOLEAN := FALSE;
    gustavo_count INTEGER := 0;
    rec RECORD;
BEGIN
    -- Check if asistencias_qr table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'asistencias_qr'
    ) INTO table_exists;
    
    RAISE NOTICE 'Table asistencias_qr exists: %', table_exists;
    
    -- List all tables that contain 'asistencia' or 'attendance'
    RAISE NOTICE 'Tables containing asistencia/attendance:';
    FOR rec IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND (table_name LIKE '%asistencia%' OR table_name LIKE '%attendance%')
    LOOP
        RAISE NOTICE 'Found table: %', rec.table_name;
    END LOOP;
    
    -- Find all players with 'Gustavo' in name
    RAISE NOTICE 'Searching for Gustavo in players table:';
    FOR rec IN 
        SELECT id, name, team_id 
        FROM players 
        WHERE LOWER(name) LIKE '%gustavo%'
    LOOP
        RAISE NOTICE 'Found player: % (ID: %, Team: %)', rec.name, rec.id, rec.team_id;
        gustavo_count := gustavo_count + 1;
    END LOOP;
    
    IF gustavo_count = 0 THEN
        RAISE NOTICE 'No players found with Gustavo in name';
        RAISE NOTICE 'All players in database:';
        FOR rec IN 
            SELECT id, name 
            FROM players 
            LIMIT 10
        LOOP
            RAISE NOTICE 'Player: % (ID: %)', rec.name, rec.id;
        END LOOP;
    END IF;
    
    -- Check facial_attendance table for Gustavo
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facial_attendance') THEN
        RAISE NOTICE 'Checking facial_attendance for Gustavo:';
        FOR rec IN 
            SELECT fa.id, p.name, fa.match_id, fa.server_timestamp
            FROM facial_attendance fa
            JOIN players p ON fa.player_id = p.id
            WHERE LOWER(p.name) LIKE '%gustavo%'
            LIMIT 5
        LOOP
            RAISE NOTICE 'Facial attendance: % - Match: %, Time: %', rec.name, rec.match_id, rec.server_timestamp;
        END LOOP;
    END IF;
    
    -- Check if asistencias_qr table exists and show its structure
    IF table_exists THEN
        RAISE NOTICE 'asistencias_qr table structure:';
        FOR rec IN 
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'asistencias_qr'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE 'Column: % | Type: % | Nullable: %', rec.column_name, rec.data_type, rec.is_nullable;
        END LOOP;
        
        -- Show sample data from asistencias_qr
        RAISE NOTICE 'Sample data from asistencias_qr:';
        FOR rec IN 
            SELECT aq.*, p.name as player_name
            FROM asistencias_qr aq
            LEFT JOIN players p ON aq.player_id = p.id
            LIMIT 5
        LOOP
            RAISE NOTICE 'Record: Player=% (%), Match=%, Created=%', rec.player_name, rec.player_id, rec.match_id, rec.created_at;
        END LOOP;
    END IF;
    
END $$;