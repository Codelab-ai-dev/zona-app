# Supabase Migrations - Zona Gol

Este directorio contiene las migraciones de la base de datos para el sistema Zona Gol.

## 📋 Lista de Migraciones

| Archivo | Descripción | Estado |
|---------|-------------|---------|
| `20241201000001_initial_setup.sql` | Configuración inicial y tipos enum | ✅ |
| `20241201000002_create_users_table.sql` | Tabla de usuarios | ✅ |
| `20241201000003_create_leagues_table.sql` | Tabla de ligas | ✅ |
| `20241201000004_create_tournaments_table.sql` | Tabla de torneos | ✅ |
| `20241201000005_create_teams_table.sql` | Tabla de equipos | ✅ |
| `20241201000006_create_players_table.sql` | Tabla de jugadores | ✅ |
| `20241201000007_create_matches_table.sql` | Tabla de partidos | ✅ |
| `20241201000008_create_player_stats_table.sql` | Tabla de estadísticas | ✅ |
| `20241201000009_create_foreign_keys.sql` | Claves foráneas adicionales | ✅ |
| `20241201000010_create_functions_and_triggers.sql` | Funciones y triggers | ✅ |
| `20241201000011_create_rls_policies.sql` | Políticas RLS | ✅ |
| `20241201000012_fix_auth_profiles.sql` | Fix tabla profiles y auth | ✅ |
| `20241201000013_additional_auth_fixes.sql` | Fixes adicionales de auth | ✅ |

## 🚀 Cómo Aplicar las Migraciones

### Opción 1: A través del Dashboard de Supabase

1. Ve al [Dashboard de Supabase](https://supabase.com/dashboard)
2. Selecciona tu proyecto
3. Ve a **SQL Editor**
4. Ejecuta cada migración **en orden secuencial**:
   - Copia el contenido de cada archivo `.sql`
   - Pégalo en el editor SQL
   - Ejecuta con el botón "Run"
   - Repite para la siguiente migración

### Opción 2: A través del CLI de Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Inicializar Supabase en el proyecto
supabase init

# Vincular con tu proyecto remoto
supabase link --project-ref tu-project-id

# Aplicar migraciones
supabase db push
```

### Opción 3: Migración Manual

Si prefieres aplicar todo de una vez, puedes ejecutar el archivo `schema.sql` que contiene todo el esquema completo:

```sql
-- Ejecutar el contenido de lib/supabase/schema.sql
```

## 🔐 Políticas de Seguridad (RLS)

Las migraciones incluyen políticas de Row Level Security (RLS) que implementan:

### Usuarios (`users`)
- ✅ Los usuarios pueden ver y editar su propio perfil
- ✅ Super admins pueden ver todos los usuarios
- ✅ Control de acceso granular por rol

### Ligas (`leagues`) 
- ✅ Lectura pública para ligas activas
- ✅ Solo admins de liga pueden gestionar su liga
- ✅ Super admins tienen acceso completo

### Torneos (`tournaments`)
- ✅ Lectura pública para torneos de ligas activas
- ✅ Solo admins de liga pueden gestionar torneos
- ✅ Cascada con eliminación de liga

### Equipos (`teams`)
- ✅ Lectura pública para equipos activos
- ✅ Dueños de equipo pueden gestionar su equipo
- ✅ Admins de liga pueden gestionar equipos de su liga

### Jugadores (`players`)
- ✅ Lectura pública para jugadores activos
- ✅ Dueños de equipo pueden gestionar sus jugadores
- ✅ Restricción de número de camiseta único por equipo

### Partidos (`matches`)
- ✅ Lectura pública para todos los partidos
- ✅ Solo admins de liga pueden gestionar partidos
- ✅ Validación de equipos diferentes

### Estadísticas (`player_stats`)
- ✅ Lectura pública para todas las estadísticas
- ✅ Solo admins de liga pueden gestionar estadísticas
- ✅ Validación de valores lógicos (goles >= 0, etc.)

## 📊 Estructura de la Base de Datos

```
users (extends auth.users)
├── id (UUID, PK)
├── name, email, phone
├── role (enum: super_admin, league_admin, team_owner, public)
├── league_id, team_id (FK)
└── is_active, timestamps

leagues
├── id (UUID, PK)
├── name, slug, description, logo
├── admin_id (FK → users.id)
└── is_active, timestamps

tournaments
├── id (UUID, PK)
├── name, start_date, end_date
├── league_id (FK → leagues.id)
└── is_active, timestamps

teams
├── id (UUID, PK)
├── name, slug, description, logo
├── league_id (FK → leagues.id)
├── tournament_id (FK → tournaments.id)
├── owner_id (FK → users.id)
└── is_active, timestamps

players
├── id (UUID, PK)
├── name, position, jersey_number
├── team_id (FK → teams.id)
├── photo, birth_date
└── is_active, timestamps

matches
├── id (UUID, PK)
├── tournament_id (FK → tournaments.id)
├── home_team_id, away_team_id (FK → teams.id)
├── home_score, away_score
├── match_date, status
└── timestamps

player_stats
├── id (UUID, PK)
├── player_id (FK → players.id)
├── match_id (FK → matches.id)
├── goals, assists, yellow_cards, red_cards
├── minutes_played
└── timestamps
```

## ⚠️ Notas Importantes

1. **Orden de Ejecución**: Las migraciones DEBEN ejecutarse en orden secuencial
2. **Backup**: Siempre haz backup antes de aplicar migraciones en producción
3. **Testing**: Prueba las migraciones en un entorno de desarrollo primero
4. **RLS**: Las políticas RLS están habilitadas por defecto para seguridad
5. **Índices**: Se incluyen índices optimizados para rendimiento

## 🔧 Solución de Problemas

### Error de Referencias Foráneas
```sql
-- Si encuentras errores de FK, ejecuta en este orden:
-- 1. users (sin FK a leagues/teams)
-- 2. leagues 
-- 3. tournaments
-- 4. teams
-- 5. players
-- 6. matches  
-- 7. player_stats
-- 8. foreign keys adicionales
```

### Error de Permisos RLS
```sql
-- Verificar que RLS esté habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### Regenerar Tipos TypeScript
```bash
# Después de aplicar migraciones, regenera los tipos
supabase gen types typescript --project-id tu-project-id --schema public > lib/supabase/database.types.ts
```

## 📚 Referencias

- [Documentación de Supabase Migrations](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [Row Level Security en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)