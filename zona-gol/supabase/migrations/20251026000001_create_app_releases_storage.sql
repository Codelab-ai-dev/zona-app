-- Create storage bucket for app releases (APKs)
INSERT INTO storage.buckets (id, name, public)
VALUES ('app-releases', 'app-releases', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: League admins can upload APKs to their league folder
CREATE POLICY "League admins can upload APKs to their league folder"
ON storage.objects
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

-- Policy: League admins can view APKs from their league folder
CREATE POLICY "League admins can view APKs from their league folder"
ON storage.objects
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

-- Policy: League admins can delete APKs from their league folder
CREATE POLICY "League admins can delete APKs from their league folder"
ON storage.objects
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

-- Policy: Public can download APKs (for sharing with users)
CREATE POLICY "Public can download APKs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'app-releases');

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
