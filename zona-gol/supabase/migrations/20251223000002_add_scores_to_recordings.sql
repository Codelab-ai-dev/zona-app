-- Agregar columnas de marcador directamente en match_recordings
-- Esto permite mostrar el marcador sin necesidad de tener un match vinculado

ALTER TABLE match_recordings
ADD COLUMN IF NOT EXISTS home_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS away_score INTEGER DEFAULT NULL;

-- Comentarios para documentación
COMMENT ON COLUMN match_recordings.home_score IS 'Marcador del equipo local (puede ser independiente del match vinculado)';
COMMENT ON COLUMN match_recordings.away_score IS 'Marcador del equipo visitante (puede ser independiente del match vinculado)';
