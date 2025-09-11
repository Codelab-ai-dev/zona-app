-- Fix users table policy recursion
-- Migration: 20241201000014_fix_users_policy_recursion.sql

-- Drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Super admins can view all users" ON users;
DROP POLICY IF EXISTS "Super admins can manage all users" ON users;

-- Create a policy for public access to users table (needed for authentication)
-- This allows unauthenticated access for initial login/registration
CREATE POLICY "Allow public access to users table" ON users
FOR SELECT USING (true);

-- Create a new policy for super admins without recursion
-- Using auth.jwt() instead of querying the users table directly
CREATE POLICY "Super admins can manage all users" ON users 
FOR ALL USING (
  (auth.jwt() ->> 'role')::text = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.uid() = id AND
    raw_user_meta_data->>'role' = 'super_admin'
  )
);

-- Ensure other user policies don't cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Recreate with non-recursive logic
CREATE POLICY "Users can view their own profile" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users 
FOR UPDATE USING (auth.uid() = id);
