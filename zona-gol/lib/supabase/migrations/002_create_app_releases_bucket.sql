-- =====================================================
-- Crear bucket para APKs del sistema de árbitros
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. BUCKET: app-releases (para APKs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'app-releases',
  'app-releases',
  true,
  157286400,  -- 150MB (archivos APK pueden ser grandes)
  ARRAY['application/vnd.android.package-archive', 'application/octet-stream']
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Políticas de acceso para el bucket app-releases
-- =====================================================

-- Lectura pública (para que cualquiera pueda descargar el APK)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read app-releases') THEN
    CREATE POLICY "Public read app-releases" ON storage.objects
    FOR SELECT
    USING (bucket_id = 'app-releases');
  END IF;
END $$;

-- Super admins pueden gestionar TODOS los APKs (subir, actualizar, eliminar)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Super admins can manage all APKs') THEN
    CREATE POLICY "Super admins can manage all APKs" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
      bucket_id = 'app-releases' AND
      EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'super_admin'
      )
    )
    WITH CHECK (
      bucket_id = 'app-releases' AND
      EXISTS (
        SELECT 1
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'super_admin'
      )
    );
  END IF;
END $$;

-- League admins pueden subir APKs en la carpeta de su liga
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'League admins can upload APKs to their league folder') THEN
    CREATE POLICY "League admins can upload APKs to their league folder" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'app-releases' AND
      (storage.foldername(name))[1] IN (
        SELECT league_id::text
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'league_admin'
      )
    );
  END IF;
END $$;

-- League admins pueden ver APKs de su liga
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'League admins can view APKs from their league folder') THEN
    CREATE POLICY "League admins can view APKs from their league folder" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'app-releases' AND
      (storage.foldername(name))[1] IN (
        SELECT league_id::text
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'league_admin'
      )
    );
  END IF;
END $$;

-- League admins pueden eliminar APKs de su liga
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'League admins can delete APKs from their league folder') THEN
    CREATE POLICY "League admins can delete APKs from their league folder" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'app-releases' AND
      (storage.foldername(name))[1] IN (
        SELECT league_id::text
        FROM users
        WHERE users.id = auth.uid()
          AND users.role = 'league_admin'
      )
    );
  END IF;
END $$;

-- =====================================================
-- Verificación
-- =====================================================
-- Ejecutar después para verificar que se creó correctamente:
-- SELECT * FROM storage.buckets WHERE id = 'app-releases';
-- SELECT * FROM pg_policies WHERE policyname LIKE '%APK%' OR policyname LIKE '%app-releases%';
