-- Create a function to create users without redirections or session changes
CREATE OR REPLACE FUNCTION public.create_user_admin(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_phone TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  -- Create the user in auth.users
  v_user_id := (SELECT extensions.uuid_generate_v4());
  
  INSERT INTO auth.users (
    id, 
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    is_super_admin
  ) VALUES (
    v_user_id,
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object(
      'name', p_name,
      'role', p_role,
      'phone', p_phone
    ),
    now(),
    now(),
    '',
    false
  );
  
  -- Create the user in public.users
  INSERT INTO public.users (
    id,
    email,
    name,
    role,
    phone,
    is_active
  ) VALUES (
    v_user_id,
    p_email,
    p_name,
    p_role,
    p_phone,
    true
  );
  
  -- Return the user ID
  v_result := jsonb_build_object(
    'id', v_user_id,
    'email', p_email,
    'name', p_name,
    'role', p_role
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user_admin TO authenticated;
