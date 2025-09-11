-- Configuración para desactivar verificación de email en Supabase autoalojado
-- Ejecuta este SQL en tu base de datos PostgreSQL

-- 1. Actualizar usuarios existentes para confirmarlos automáticamente
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;

-- 2. Crear una función para auto-confirmar nuevos usuarios
CREATE OR REPLACE FUNCTION auth.auto_confirm_user()
RETURNS trigger AS $$
BEGIN
  NEW.email_confirmed_at = NOW();
  NEW.confirmed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear trigger para auto-confirmar en inserción
DROP TRIGGER IF EXISTS auto_confirm_user_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.auto_confirm_user();

-- 4. Opcional: También para actualizaciones
CREATE OR REPLACE FUNCTION auth.auto_confirm_user_update()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at = NOW();
  END IF;
  IF NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS auto_confirm_user_update_trigger ON auth.users;
CREATE TRIGGER auto_confirm_user_update_trigger
  BEFORE UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.auto_confirm_user_update();