-- Script para verificar y corregir el estado de Elite Soccer Liga Guerreros
-- Fecha: 2025-01-XX

-- 1. Verificar el estado actual de todas las ligas
SELECT
  id,
  name,
  slug,
  is_active,
  created_at,
  updated_at
FROM leagues
ORDER BY created_at DESC;

-- 2. Buscar específicamente la liga Elite Soccer Liga Guerreros
SELECT
  id,
  name,
  slug,
  is_active,
  admin_id,
  created_at,
  updated_at
FROM leagues
WHERE name ILIKE '%Elite Soccer Liga Guerreros%'
   OR name ILIKE '%Elite Soccer%'
   OR name ILIKE '%Guerreros%';

-- 3. Activar la liga Elite Soccer Liga Guerreros
UPDATE leagues
SET
  is_active = true,
  updated_at = NOW()
WHERE name ILIKE '%Elite Soccer Liga Guerreros%'
   OR name ILIKE '%Elite Soccer%'
   OR (name ILIKE '%Elite%' AND name ILIKE '%Guerreros%');

-- 4. Verificar que se aplicó el cambio
SELECT
  id,
  name,
  slug,
  is_active,
  updated_at
FROM leagues
WHERE name ILIKE '%Elite Soccer Liga Guerreros%'
   OR name ILIKE '%Elite Soccer%'
   OR (name ILIKE '%Elite%' AND name ILIKE '%Guerreros%');

-- 5. Mostrar todas las ligas activas para confirmar
SELECT
  name,
  slug,
  is_active,
  created_at
FROM leagues
WHERE is_active = true
ORDER BY created_at DESC;