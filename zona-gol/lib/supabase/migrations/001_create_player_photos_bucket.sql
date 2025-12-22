-- =====================================================
-- Crear buckets para imágenes (fotos y logos)
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. BUCKET: player-photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'player-photos',
  'player-photos',
  true,
  5242880,  -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 2. BUCKET: team-logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'team-logos',
  'team-logos',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. BUCKET: league-logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'league-logos',
  'league-logos',
  true,
  2097152,  -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Políticas de acceso para todos los buckets
-- =====================================================

-- Lectura pública para todos los buckets de imágenes
DO $$
BEGIN
  -- player-photos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read player-photos') THEN
    CREATE POLICY "Public read player-photos" ON storage.objects FOR SELECT USING (bucket_id = 'player-photos');
  END IF;

  -- team-logos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read team-logos') THEN
    CREATE POLICY "Public read team-logos" ON storage.objects FOR SELECT USING (bucket_id = 'team-logos');
  END IF;

  -- league-logos
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read league-logos') THEN
    CREATE POLICY "Public read league-logos" ON storage.objects FOR SELECT USING (bucket_id = 'league-logos');
  END IF;
END $$;

-- Escritura para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth write player-photos') THEN
    CREATE POLICY "Auth write player-photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth write team-logos') THEN
    CREATE POLICY "Auth write team-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-logos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth write league-logos') THEN
    CREATE POLICY "Auth write league-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'league-logos');
  END IF;
END $$;

-- Actualización para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth update player-photos') THEN
    CREATE POLICY "Auth update player-photos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth update team-logos') THEN
    CREATE POLICY "Auth update team-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'team-logos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth update league-logos') THEN
    CREATE POLICY "Auth update league-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'league-logos');
  END IF;
END $$;

-- Eliminación para usuarios autenticados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete player-photos') THEN
    CREATE POLICY "Auth delete player-photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'player-photos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete team-logos') THEN
    CREATE POLICY "Auth delete team-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'team-logos');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Auth delete league-logos') THEN
    CREATE POLICY "Auth delete league-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'league-logos');
  END IF;
END $$;
