-- Enable RLS logic for Super Admin on storage.objects

-- Policy: Super admins can manage ALL APKs (upload, delete, view)
CREATE POLICY "Super admins can manage all APKs"
ON storage.objects
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
);
