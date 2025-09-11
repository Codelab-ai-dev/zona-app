-- Additional auth fixes for compatibility
-- Migration: 20241201000013_additional_auth_fixes.sql

-- Create a more robust user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table with better error handling
  INSERT INTO public.users (id, name, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id, 
    COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email, 
    'public', 
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(
      NEW.raw_user_meta_data->>'name', 
      NEW.raw_user_meta_data->>'full_name',
      users.name
    ),
    email = NEW.email,
    updated_at = NOW();
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the auth process
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create a function to update user profile when auth.users is updated
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error updating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_user_update();

-- Grant additional permissions to ensure compatibility
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Ensure anon and authenticated users can read what they need
GRANT SELECT ON public.leagues TO anon;
GRANT SELECT ON public.tournaments TO anon;
GRANT SELECT ON public.teams TO anon;
GRANT SELECT ON public.players TO anon;
GRANT SELECT ON public.matches TO anon;
GRANT SELECT ON public.player_stats TO anon;

-- Create a health check function
CREATE OR REPLACE FUNCTION check_user_setup()
RETURNS TABLE(
  auth_users_count bigint,
  public_users_count bigint,
  profiles_accessible boolean
) AS $$
BEGIN
  SELECT 
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM public.users),
    (SELECT COUNT(*) FROM public.profiles) IS NOT NULL
  INTO auth_users_count, public_users_count, profiles_accessible;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;