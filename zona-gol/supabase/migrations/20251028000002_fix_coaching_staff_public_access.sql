-- Fix coaching_staff RLS policy to allow public read access
-- This allows unauthenticated users to view coaching staff in public team pages

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "coaching_staff_select_policy" ON coaching_staff;

-- Create new policy that allows public read access
CREATE POLICY "coaching_staff_public_select_policy" ON coaching_staff
  FOR SELECT
  USING (true);

-- Comment explaining the change
COMMENT ON POLICY "coaching_staff_public_select_policy" ON coaching_staff IS
  'Allows public read access to coaching staff data for public team pages';
