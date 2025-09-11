-- Script para insertar datos de prueba en facial_attendance
-- Ejecutar después de aplicar la migración 20250831000001_create_facial_attendance_table.sql

-- Solo ejecutar si la tabla facial_attendance existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'facial_attendance') THEN
    
    -- Insertar algunos registros de prueba
    -- Necesitamos IDs existentes de players y matches
    INSERT INTO facial_attendance (
      player_id,
      match_id,
      recognition_mode,
      confidence_score,
      similarity_score,
      local_timestamp,
      server_timestamp,
      sync_status,
      face_quality_score,
      processing_time_ms,
      device_info
    )
    SELECT 
      p.id as player_id,
      m.id as match_id,
      'quick' as recognition_mode,
      0.85 as confidence_score,
      0.82 as similarity_score,
      NOW() - INTERVAL '1 hour' as local_timestamp,
      NOW() - INTERVAL '1 hour' as server_timestamp,
      'synced' as sync_status,
      0.78 as face_quality_score,
      1250 as processing_time_ms,
      '{"platform": "flutter", "device": "tablet", "app_version": "1.0.0"}' as device_info
    FROM players p
    CROSS JOIN matches m
    WHERE m.status IN ('scheduled', 'in_progress')
    LIMIT 3;

    -- Insertar algunos registros más recientes
    INSERT INTO facial_attendance (
      player_id,
      match_id,
      recognition_mode,
      confidence_score,
      similarity_score,
      local_timestamp,
      server_timestamp,
      sync_status,
      face_quality_score,
      processing_time_ms,
      device_info
    )
    SELECT 
      p.id as player_id,
      m.id as match_id,
      'verified' as recognition_mode,
      0.92 as confidence_score,
      0.89 as similarity_score,
      NOW() - INTERVAL '10 minutes' as local_timestamp,
      NOW() - INTERVAL '10 minutes' as server_timestamp,
      'synced' as sync_status,
      0.86 as face_quality_score,
      980 as processing_time_ms,
      '{"platform": "flutter", "device": "phone", "app_version": "1.0.0"}' as device_info
    FROM players p
    CROSS JOIN matches m
    WHERE m.status IN ('scheduled', 'in_progress')
    ORDER BY RANDOM()
    LIMIT 2;

    RAISE NOTICE 'Test attendance data inserted successfully';
    
  ELSE
    RAISE NOTICE 'facial_attendance table does not exist. Run the migration first.';
  END IF;
END $$;