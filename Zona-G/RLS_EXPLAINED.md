# 🛡️ Row Level Security (RLS) - Explicación Simple

## ¿Qué es RLS?

**Row Level Security (RLS)** es como tener un guardia de seguridad en cada fila de tu base de datos.

### Analogía: Un Hotel 🏨

Imagina que tu base de datos es un hotel:

| Concepto | En el Hotel | En tu App |
|----------|------------|-----------|
| **Edificio** | Hotel completo | Base de datos |
| **Pisos** | Cada piso = Una liga | Tablas (players, matches, etc.) |
| **Habitaciones** | Cada habitación = Un registro | Cada fila en la tabla |
| **Llave del lobby** | Tarjeta para entrar al hotel | ANON key (pública) |
| **Llave de habitación** | Tarjeta de TU habitación | Token de usuario (privado) |
| **Cerradura electrónica** | Verifica tu tarjeta | RLS Policy |

### El Flujo

```
1. Usuario llega al hotel
   → Tiene llave del lobby (ANON key) ✅ Puede entrar

2. Usuario intenta entrar a habitación 305
   → Inserta su tarjeta en la cerradura
   → Cerradura verifica: "¿Esta tarjeta es de esta habitación?"

3. SI es su habitación:
   → ✅ Puerta se abre

4. SI NO es su habitación:
   → ❌ Puerta bloqueada
   → "Acceso denegado"
```

**En tu app:**

```
1. Usuario abre la app
   → Tiene ANON key ✅ Puede conectarse a Supabase

2. Usuario intenta ver jugadores de Liga Norte
   → Envía request con su token de usuario
   → RLS Policy verifica: "¿Este usuario pertenece a Liga Norte?"

3. SI el usuario es de Liga Norte:
   → ✅ Ve los jugadores

4. SI el usuario es de Liga Sur:
   → ❌ No ve nada
   → "No tienes permiso"
```

---

## ¿Por qué la ANON key puede estar en el código?

### ❌ Malentendido Común

"Si alguien ve mi ANON key, pueden hackear mi base de datos"

### ✅ Realidad

**La ANON key es como la llave del lobby del hotel - TODO EL MUNDO la tiene.**

Pero tener la llave del lobby NO significa que puedes:
- ❌ Entrar a las habitaciones de otros
- ❌ Ver quién está en cada habitación
- ❌ Modificar las reservas
- ❌ Acceder al cuarto de sistemas

### Ejemplo Real

```javascript
// Tu ANON key está en el código (y está bien)
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

// Un atacante la extrae del APK
console.log("¡Ja! Tengo la ANON key:", ANON_KEY)

// Intenta ver jugadores de Liga Norte
const { data } = await supabase
  .from('players')
  .select('*')
  .eq('team_id', 'equipo-liga-norte')

// Resultado:
// ❌ ERROR: new row violates row-level security policy
// → RLS Policy bloqueó el acceso porque no está autenticado como usuario de Liga Norte
```

**¿Por qué falló?**

Porque la RLS Policy dice:

```sql
-- Solo puedes ver jugadores de TU liga
CREATE POLICY "users_can_view_league_players"
ON players FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM teams
    JOIN users ON users.league_id = teams.league_id
    WHERE teams.id = players.team_id
    AND users.id = auth.uid()  ← Aquí está la magia
  )
);
```

El `auth.uid()` viene del **token de usuario** (no del ANON key).

---

## RLS Policy para `asistencias_qr`

### El Problema

Sin RLS, cualquiera podría:
- Marcar asistencia de jugadores de otras ligas
- Ver quién asistió a partidos de otras ligas
- Sabotear registros de otras ligas

### La Solución: RLS Policy

```sql
CREATE POLICY "league_admins_can_insert_attendance"
ON asistencias_qr
FOR INSERT
TO authenticated
WITH CHECK (
  -- 1️⃣ Usuario debe estar autenticado
  auth.role() = 'authenticated'

  AND

  -- 2️⃣ Usuario debe ser league_admin o super_admin
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('league_admin', 'super_admin')
  )

  AND

  -- 3️⃣ El partido debe ser de SU liga
  EXISTS (
    SELECT 1 FROM matches
    JOIN users ON users.league_id = matches.league_id
    WHERE matches.id = asistencias_qr.match_id
    AND users.id = auth.uid()
  )

  AND

  -- 4️⃣ El jugador debe ser de SU liga
  EXISTS (
    SELECT 1 FROM players
    JOIN teams ON teams.id = players.team_id
    JOIN users ON users.league_id = teams.league_id
    WHERE players.id = asistencias_qr.player_id
    AND users.id = auth.uid()
  )
);
```

### Desglose Paso a Paso

#### 1️⃣ **Verificar Autenticación**

```sql
auth.role() = 'authenticated'
```

**¿Qué hace?**
- Verifica que el usuario haya iniciado sesión
- Si solo tiene ANON key → ❌ Rechazado

**Analogía:**
- "¿Tienes una habitación reservada o solo estás en el lobby?"

---

#### 2️⃣ **Verificar Rol**

```sql
EXISTS (
  SELECT 1 FROM users
  WHERE users.id = auth.uid()
  AND users.role IN ('league_admin', 'super_admin')
)
```

**¿Qué hace?**
- Busca al usuario en la tabla `users`
- Verifica que su rol sea `league_admin` o `super_admin`
- Team owners NO pueden marcar asistencia

**Analogía:**
- "¿Eres gerente del hotel o solo un huésped?"

**Escenarios:**

✅ **Pasa:**
```
Usuario: admin@liga-norte.com
Rol: league_admin
→ Tiene permiso ✅
```

❌ **Falla:**
```
Usuario: coach@equipo-a.com
Rol: team_owner
→ No tiene permiso ❌
```

---

#### 3️⃣ **Verificar que el Partido sea de su Liga**

```sql
EXISTS (
  SELECT 1 FROM matches
  JOIN users ON users.league_id = matches.league_id
  WHERE matches.id = asistencias_qr.match_id
  AND users.id = auth.uid()
)
```

**¿Qué hace?**
1. Busca el partido que quiere marcar
2. Obtiene el `league_id` del partido
3. Compara con el `league_id` del usuario
4. Si coinciden → ✅ Continúa
5. Si NO coinciden → ❌ Rechazado

**Analogía:**
- "¿Estás intentando entrar a una habitación de TU piso o de otro piso?"

**Escenarios:**

✅ **Pasa:**
```
Usuario: admin@liga-norte.com
Liga del usuario: liga-norte-uuid
Partido: Jornada 5, Liga Norte
Liga del partido: liga-norte-uuid
→ Coincide ✅
```

❌ **Falla:**
```
Usuario: admin@liga-norte.com
Liga del usuario: liga-norte-uuid
Partido: Jornada 3, Liga Sur
Liga del partido: liga-sur-uuid
→ NO coincide ❌
```

---

#### 4️⃣ **Verificar que el Jugador sea de su Liga**

```sql
EXISTS (
  SELECT 1 FROM players
  JOIN teams ON teams.id = players.team_id
  JOIN users ON users.league_id = teams.league_id
  WHERE players.id = asistencias_qr.player_id
  AND users.id = auth.uid()
)
```

**¿Qué hace?**
1. Busca al jugador
2. Encuentra su equipo (`team_id`)
3. Encuentra la liga del equipo (`league_id`)
4. Compara con la liga del usuario
5. Si coinciden → ✅ Puede marcar asistencia
6. Si NO coinciden → ❌ Rechazado

**Analogía:**
- "¿Estás intentando registrar a alguien que vive en este hotel o en otro hotel?"

**Escenarios:**

✅ **Pasa:**
```
Usuario: admin@liga-norte.com
Liga del usuario: liga-norte-uuid

Jugador: Juan Pérez
Equipo del jugador: Equipo A
Liga del equipo: liga-norte-uuid
→ Coincide ✅
```

❌ **Falla:**
```
Usuario: admin@liga-norte.com
Liga del usuario: liga-norte-uuid

Jugador: Carlos López
Equipo del jugador: Equipo Z
Liga del equipo: liga-sur-uuid
→ NO coincide ❌
```

---

## Ejemplo Completo: Flujo de Marcar Asistencia

### Escenario 1: ✅ EXITOSO

```
👤 Usuario:
   Email: admin@liga-norte.com
   ID: user-123
   Role: league_admin
   League: liga-norte-uuid

🏟️ Partido:
   ID: match-456
   Name: Jornada 5
   League: liga-norte-uuid

⚽ Jugador:
   ID: player-789
   Name: Juan Pérez
   Team: Equipo A (team-abc)
   League: liga-norte-uuid (via team)

📱 App hace request:
   POST /asistencias_qr
   {
     match_id: "match-456",
     player_id: "player-789",
     attendance_status: "present"
   }
   Headers: { Authorization: "Bearer user-123-token" }

🔒 RLS Policy verifica:
   1️⃣ auth.role() = 'authenticated'
      → ✅ Usuario está autenticado

   2️⃣ user.role IN ('league_admin', 'super_admin')
      → ✅ Rol es league_admin

   3️⃣ match.league_id = user.league_id
      → ✅ liga-norte-uuid = liga-norte-uuid

   4️⃣ player → team → league = user.league_id
      → ✅ liga-norte-uuid = liga-norte-uuid

✅ TODAS las verificaciones pasaron
✅ Asistencia marcada exitosamente
```

---

### Escenario 2: ❌ RECHAZADO (Diferente Liga)

```
👤 Usuario:
   Email: admin@liga-norte.com
   ID: user-123
   Role: league_admin
   League: liga-norte-uuid  ← Liga Norte

🏟️ Partido:
   ID: match-999
   Name: Jornada 3
   League: liga-sur-uuid  ← Liga Sur ❌

⚽ Jugador:
   ID: player-888
   Name: Carlos López
   Team: Equipo Z
   League: liga-sur-uuid  ← Liga Sur ❌

📱 App hace request:
   POST /asistencias_qr
   {
     match_id: "match-999",
     player_id: "player-888",
     attendance_status: "present"
   }

🔒 RLS Policy verifica:
   1️⃣ auth.role() = 'authenticated'
      → ✅ Pasa

   2️⃣ user.role IN ('league_admin', 'super_admin')
      → ✅ Pasa

   3️⃣ match.league_id = user.league_id
      → ❌ FALLA: liga-sur-uuid ≠ liga-norte-uuid

❌ Verificación 3 falló
❌ ERROR: new row violates row-level security policy
❌ Asistencia NO fue creada
```

---

### Escenario 3: ❌ RECHAZADO (Rol Incorrecto)

```
👤 Usuario:
   Email: coach@equipo-a.com
   ID: user-456
   Role: team_owner  ← NO es league_admin ❌
   League: liga-norte-uuid

🏟️ Partido:
   ID: match-456
   League: liga-norte-uuid

⚽ Jugador:
   ID: player-789
   League: liga-norte-uuid

📱 App hace request:
   POST /asistencias_qr
   { ... }

🔒 RLS Policy verifica:
   1️⃣ auth.role() = 'authenticated'
      → ✅ Pasa

   2️⃣ user.role IN ('league_admin', 'super_admin')
      → ❌ FALLA: team_owner no está en la lista

❌ Verificación 2 falló
❌ ERROR: new row violates row-level security policy
❌ Asistencia NO fue creada
```

---

## ¿Cómo Implementar RLS en Supabase?

### Paso 1: Habilitar RLS en la Tabla

```sql
ALTER TABLE asistencias_qr ENABLE ROW LEVEL SECURITY;
```

**Efecto:**
- Ahora NADIE puede acceder a esta tabla (ni siquiera con ANON key)
- Debes crear policies para permitir acceso

---

### Paso 2: Crear la Policy

```sql
CREATE POLICY "league_admins_can_insert_attendance"
ON asistencias_qr
FOR INSERT
TO authenticated
WITH CHECK (...);
```

---

### Paso 3: Probar la Policy

En Supabase SQL Editor:

```sql
-- Simular ser un usuario específico
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-123", "role": "authenticated"}';

-- Intentar insertar
INSERT INTO asistencias_qr (match_id, player_id, attendance_status)
VALUES ('match-456', 'player-789', 'present');

-- Si funciona: ✅ Policy configurada correctamente
-- Si falla: ❌ Revisar condiciones de la policy
```

---

## Resumen: ¿Por Qué Estás Seguro?

### ❓ "Pero mi ANON key está en el código..."

✅ **Está bien**, porque:

1. **ANON key = Llave del lobby**
   - Solo te permite conectarte
   - NO te da acceso a datos

2. **User token = Llave de habitación**
   - Se genera al hacer login
   - Contiene tu user ID
   - RLS lo usa para verificar permisos

3. **RLS Policies = Cerraduras**
   - Verifican CADA operación
   - Comparan tu user ID con los datos
   - Bloquean acceso no autorizado

### 🔒 Capas de Seguridad

```
Capa 1: SSL/TLS (HTTPS)
        ↓ Encripta la comunicación

Capa 2: Authentication (Login)
        ↓ Verifica que eres quien dices ser

Capa 3: Authorization (RLS)
        ↓ Verifica que PUEDES hacer lo que intentas

Capa 4: Application Logic
        ↓ Validaciones adicionales en el código
```

**Todas juntas = App segura** 🛡️

---

## Checklist de Seguridad

Antes de ir a producción:

- [ ] **RLS habilitado en TODAS las tablas**
  ```sql
  ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **Policies creadas para cada operación (SELECT, INSERT, UPDATE, DELETE)**
  ```sql
  CREATE POLICY "name" ON table FOR SELECT/INSERT/UPDATE/DELETE ...
  ```

- [ ] **Policies probadas con diferentes usuarios y roles**
  - League admin de Liga Norte ✅
  - League admin de Liga Sur ✅
  - Team owner ✅
  - Usuario sin rol ✅

- [ ] **Verificar cross-league access bloqueado**
  - Liga Norte NO puede ver Liga Sur ✅

- [ ] **SSL/TLS habilitado (producción)**
  ```
  ENV=prod → SSL validation ON
  ```

- [ ] **Logs monitoreados**
  - Revisar intentos fallidos
  - Detectar patrones sospechosos

---

**¿Dudas?** Revisa SECURITY.md para detalles técnicos completos.

**Última actualización:** 2025-12-13
