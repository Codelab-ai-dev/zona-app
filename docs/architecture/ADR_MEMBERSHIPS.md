# ADR: memberships y permisos deportivos por liga, equipo y partido

**Estado:** Propuesta, pendiente de aprobación. Issue #44.
**Fecha:** 2026-11-13
**Alcance:** solo diseño. **No cambia código, esquema ni roles antes del lanzamiento de enero de 2027.**

## 1. Contexto: cómo funciona hoy

### Identidad
- Hay una sola tabla de identidad, `public.users`, con:
  - `role` (enum `user_role`: `super_admin`, `league_admin`, `team_owner`, `public`);
  - `league_id` y `team_id`, que son **un solo ámbito** por usuario.
- El middleware lee al usuario de la base **en cada petición** (`auth/profiles.go`). El JWT solo lleva el `sub`. Por eso un cambio de permisos aplica en la siguiente petición, sin cerrar sesiones.
- No hay políticas RLS en la base. Toda la autorización está en Go.

### Autorización por recurso (`authz.Checker`)
- `CanManageLeague`, `CanManageTournament` y `CanManageMatch` comparan `leagues.admin_id` con quien llama.
- `CanManageTeam` y `CanManagePlayer` comparan `teams.owner_id` **o** `leagues.admin_id`.
- `super_admin` puede todo, pero el recurso tiene que existir.
- **Checker no lee `role`, `league_id` ni `team_id`.** El permiso ya depende del recurso, no del rol global. Eso hace barata la evolución.

### Dónde sí se usa el rol o el ámbito único
| Uso | Archivo | Problema con varias ligas |
|---|---|---|
| Rutas con `RequireRole(...)` | `leagues`, `accounts`, `teams`, `stats`, `superadmin`, `notifications`, `knowledge` | Una persona tiene un solo rol: no puede ser `league_admin` y `team_owner` a la vez |
| Directorio de usuarios del admin de liga | `directory/service.go:32` | Usa `caller.LeagueID`: solo ve una liga, y nada si es `NULL` |
| Admin de liga editando a un dueño de equipo | `accounts/service.go:116` | Depende del `users.league_id` del usuario editado: si es `NULL`, nadie puede editarlo |
| Contexto del agente de WhatsApp | `agent/repository.go:53` | Elige una sola liga (`LIMIT 1`) |
| App Flutter | ~15 pantallas usan `user.leagueId` / `user.teamId` de `GET /me` | Una sola liga y un solo equipo por usuario |

La web **no** lee `league_id`/`team_id`: usa `GET /leagues/mine` y `GET /my-teams`, que ya devuelven listas.

### Lo que no existe todavía
- **Árbitros como usuarios.** `match_referee_reports` guarda nombres en texto y solo el admin de la liga puede leer o escribir el acta.
- **Delegados.** `coaching_staff` no tiene `user_id`. Solo hay un dueño por equipo (`teams.owner_id NOT NULL`).
- **Entitlements de Play.** `stream_purchases` existe pero ningún código la usa. `premium` y `unlisted` se tratan como públicos (issue #39).

## 2. Decisión

### 2.1 Una identidad, varias memberships
- Cada persona tiene **un** registro en `users`. Nunca se duplica un usuario para darle otro rol.
- Los permisos deportivos salen de tres fuentes, todas ligadas a un recurso concreto:
  1. **Membership de liga o equipo** (tabla `memberships`), para responsabilidades que duran: admin de liga, delegado de equipo.
  2. **Asignación a un partido** (tabla `match_officials`), para responsabilidades puntuales: árbitro, asistente.
  3. **Entitlement** (tabla `entitlements`, diferida con Play), para acceso a contenido privado o de pago.
- `users.role` queda solo para lo **global de plataforma**: `super_admin` y `public` (cualquier persona registrada). `league_admin` y `team_owner` se vuelven **valores heredados**: se mantienen mientras haya clientes que los lean (sección 5).

### 2.2 Los dueños actuales siguen siendo válidos
- `leagues.admin_id` y `teams.owner_id` **no se eliminan**. Siguen siendo el titular principal (NOT NULL, con FK).
- Una membership **agrega** personas; no reemplaza al titular. Quien es `admin_id` hoy conserva todos sus permisos sin migrar nada.
- Checker pasa a responder "titular **o** membership activa" en el mismo query.

### 2.3 Permisos por acción, no por rol
Checker conserva sus métodos actuales, con el mismo significado, y suma métodos por acción concreta:

| Método | Quién pasa |
|---|---|
| `CanManageLeague/Tournament/Match` (existentes) | `super_admin`; `leagues.admin_id`; membership `league_admin` de esa liga |
| `CanManageTeam/Player` (existentes) | lo anterior de la liga del equipo; `teams.owner_id`; membership `team_delegate` de **ese** equipo |
| `CanSubmitMatchReport(match)` (nuevo) | quien gestiona el partido; árbitro asignado a **ese** partido, solo dentro de la ventana permitida (sección 3.3) |
| `CanViewMatchReport(match)` (nuevo) | lo anterior; titular o delegado de **uno de los dos equipos** del partido |
| `CanPlayRecording(recording)` (nuevo, con Play) | quien gestiona la liga; entitlement vigente para esa grabación, su transmisión o un pase de liga |

Cada método recibe el recurso y deriva la liga en el servidor. Nunca confía en un `league_id` que mande el cliente.

### 2.4 Permisos de la membership
| Rol de membership | Ámbito | Puede | No puede |
|---|---|---|---|
| `league_admin` | una liga | todo lo de la liga: torneos, partidos, resultados, equipos, finanzas, sanciones; asignar árbitros; dar o quitar `team_delegate` en equipos de su liga | tocar otras ligas; crear otros `league_admin` (solo `super_admin`) |
| `team_delegate` | un equipo | roster, cuerpo técnico, solicitudes de registro y credenciales de **su** equipo; ver el acta de partidos de su equipo | otros equipos, aunque sean de la misma liga; resultados; finanzas de la liga |
| árbitro (en `match_officials`, no es membership) | un partido | capturar el acta de **ese** partido en la ventana permitida | otros partidos; publicar o cambiar el resultado oficial |

## 3. Modelo de datos propuesto

Son migraciones Goose **nuevas**; `00001_baseline.sql` no se toca. No se aplican antes de enero.

### 3.1 `memberships`
```sql
CREATE TYPE public.membership_role AS ENUM ('league_admin', 'team_delegate');

CREATE TABLE public.memberships (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role        public.membership_role NOT NULL,
    league_id   uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
    team_id     uuid REFERENCES public.teams(id)   ON DELETE CASCADE,
    granted_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    revoked_at  timestamptz,
    revoked_by  uuid REFERENCES public.users(id) ON DELETE SET NULL,
    -- Exactly one scope, and it must match the role.
    CONSTRAINT membership_scope CHECK (
        (role = 'league_admin'  AND league_id IS NOT NULL AND team_id IS NULL) OR
        (role = 'team_delegate' AND team_id   IS NOT NULL AND league_id IS NULL)
    )
);

-- One active membership per person, role and scope.
CREATE UNIQUE INDEX memberships_active_uniq
    ON public.memberships (user_id, role, COALESCE(league_id, team_id))
    WHERE revoked_at IS NULL;
CREATE INDEX memberships_league_idx ON public.memberships (league_id) WHERE revoked_at IS NULL;
CREATE INDEX memberships_team_idx   ON public.memberships (team_id)   WHERE revoked_at IS NULL;
```
- **Columnas FK separadas, no un `scope_id` genérico,** para que la base garantice que la liga o el equipo existen.
- **No se borra; se revoca** (`revoked_at`, `revoked_by`), para auditar quién tuvo acceso y cuándo.
- La liga de un `team_delegate` sale de `teams.league_id` al consultar. No se copia, así nunca puede desincronizarse.

### 3.2 Checker con memberships (ejemplo)
```sql
-- CanManageTeam: titular, admin de la liga (titular o membership) o delegado del equipo.
SELECT tm.owner_id = $2
    OR l.admin_id  = $2
    OR EXISTS (SELECT 1 FROM public.memberships m
               WHERE m.user_id = $2 AND m.revoked_at IS NULL
                 AND ((m.role = 'league_admin'  AND m.league_id = tm.league_id)
                   OR (m.role = 'team_delegate' AND m.team_id   = tm.id)))
FROM public.teams tm JOIN public.leagues l ON l.id = tm.league_id
WHERE tm.id = $1
```
La forma del query (un booleano; 404 si no existe el recurso) no cambia, así que `check()` y los handlers quedan iguales.

### 3.3 `match_officials`
```sql
CREATE TABLE public.match_officials (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id    uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    user_id     uuid REFERENCES public.users(id) ON DELETE SET NULL, -- NULL: official without an account
    name        text NOT NULL,
    role        text NOT NULL CHECK (role IN ('referee', 'assistant_1', 'assistant_2', 'fourth_official')),
    assigned_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at  timestamptz NOT NULL DEFAULT now(),
    revoked_at  timestamptz,
    UNIQUE (match_id, role)
);
```
- **Quién asigna:** solo quien gestiona el partido. Puede asignar a una persona sin cuenta (solo nombre), como hoy en el acta.
- **Ventana del árbitro:** puede capturar el acta mientras el partido esté `scheduled` o `in_progress`, y hasta **N horas** después de terminado. N está por decidir (sección 7).
- **Qué captura el árbitro:** el acta (observaciones, incidencias, tarjetas propuestas). El marcador oficial y su publicación siguen siendo del admin de la liga, que lo confirma. Así se conserva la auditabilidad del resultado oficial.
- Los nombres en `match_referee_reports` se mantienen. Al asignar, se llenan desde `match_officials` para que el acta actual siga funcionando.

### 3.4 `entitlements` (diferido con Play, issue #39)
```sql
CREATE TABLE public.entitlements (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_type text NOT NULL CHECK (resource_type IN ('recording', 'stream', 'league_pass')),
    resource_id   uuid NOT NULL,
    source        text NOT NULL CHECK (source IN ('purchase', 'grant')),
    purchase_id   uuid REFERENCES public.stream_purchases(id) ON DELETE SET NULL,
    valid_from    timestamptz NOT NULL DEFAULT now(),
    valid_until   timestamptz,
    revoked_at    timestamptz
);
```
- **Separa dos decisiones:**
  - **ver metadatos** (título, miniatura), que depende de `visibility`;
  - **reproducir**, que exige entitlement vigente o gestionar la liga.
- `premium` y `unlisted` nunca equivalen a acceso libre (invariante de `CLAUDE.md`).
- No se implementa hasta reactivar Play.

## 4. Escenarios obligatorios

| Escenario | Cómo se resuelve | Hoy |
|---|---|---|
| Una persona administra la Liga A y es delegada de un equipo de la Liga B | Un usuario con dos memberships: `league_admin` (A) y `team_delegate` (equipo de B). Checker evalúa cada recurso por separado: nada de A le da acceso a B ni al revés | Funciona a medias. Checker ya lo permitiría con `admin_id` y `owner_id`, pero `RequireRole` y la app Flutter solo admiten un rol y un ámbito |
| El árbitro registra el acta solo de su partido | `match_officials` + `CanSubmitMatchReport` | No existe |
| El delegado administra su roster y no los demás | membership `team_delegate` con `team_id`; `CanManageTeam` solo pasa en ese equipo | Solo con un dueño por equipo (`owner_id`) |
| El público solo ve lo publicado | Sin cambios: las lecturas públicas siguen con `canSeeLeague` / `visibleMatches` / `ensureVisible`, con un principal anónimo | Ya funciona |
| Playback privado o premium con entitlement explícito | `entitlements` + `CanPlayRecording` | Abierto (#39). Bloqueante antes de activar Play |

## 5. Estrategia expand → migrate → contract

Ninguna fase rompe a los clientes actuales. Cada una se puede revertir sin perder datos.

### Fase 0: antes de enero, sin tocar roles
Arreglos chicos a problemas que ya existen. Cada uno va en su propio issue y PR (sección 8). No se crean tablas nuevas.

### Fase 1: expand (después del lanzamiento y de estabilizar)
1. **Migración:** crear `memberships` y `match_officials`.
2. **Backfill idempotente:**
   - una membership `league_admin` por cada `leagues.admin_id`;
   - una `team_delegate` por cada `teams.owner_id`.

   Es redundante a propósito: el titular sigue funcionando aunque falte la fila.
3. **Doble escritura:** al crear una liga, al usar `SetLeagueAdmin` y en `POST /admin/users` con `team_id`, también se escribe la membership.
4. **Checker:** pasa a "titular **o** membership".
5. **Paridad:** el resultado de cada Checker es idéntico al actual para todos los datos existentes. Se comprueba con una prueba de integración que compara antes y después sobre un seed con varias ligas.
6. **Rollback:** revertir el código de Checker. Las tablas nuevas pueden quedarse.

### Fase 2: migrate
1. **`GET /me`:** agrega `memberships: [{role, league_id, team_id, league_name, team_name}]`. Es un cambio aditivo; `role`, `league_id` y `team_id` siguen llenándose con el **contexto principal** (la primera liga o equipo) para clientes viejos.
2. **Web y Flutter:** muestran un selector de contexto ("Liga A — admin", "Halcones — delegado") y enrutan según la membership elegida, no según `role`. Flutter deja de leer `user.leagueId` y usa el contexto elegido.
3. **`RequireRole(league_admin)` / `RequireRole(team_owner)`:** se reemplazan ruta por ruta por `RequireAuth` y el Checker del recurso. `RequireRole(super_admin)` se queda.
4. **Directorio, cuentas y agente:** pasan a usar memberships en vez de `users.league_id`.
5. **Pantallas nuevas:** asignar árbitros y que el árbitro vea "mis partidos" y capture su acta.

### Fase 3: contract (después de un periodo de observación)
1. **Versión mínima:** se exige una versión mínima de Flutter que ya use `memberships`.
2. **Columnas heredadas:** se deja de escribir `users.league_id`/`team_id` y los roles `league_admin`/`team_owner`. **Las columnas y los valores del enum no se borran** en esta fase: se marcan como obsoletos.
3. **Borrado:** solo con un ADR aparte, cuando ningún cliente soportado los lea.

## 6. Matriz de pruebas negativas

Cada fila es una prueba de integración con PostgreSQL real y al menos **dos ligas** (A y B) con sus equipos, partidos y usuarios. Lo esperado es 403, o 404 donde la política oculta la existencia del recurso.

| # | Quién | Intenta | Esperado |
|---|---|---|---|
| 1 | admin de la Liga A (titular o membership) | editar torneo, partido, resultado, finanzas o sanción de la Liga B | 403 |
| 2 | admin de A y delegado de un equipo de B | gestionar **otro** equipo de B | 403 |
| 3 | el mismo usuario | publicar un resultado de B | 403 (ser delegado no da poder de liga) |
| 4 | delegado del equipo X | roster, cuerpo técnico o solicitudes de registro del equipo Y (misma liga) | 403 |
| 5 | delegado del equipo X | crear, editar o borrar partidos, resultados o finanzas de su liga | 403 |
| 6 | árbitro asignado al partido P | acta del partido Q (misma liga) | 403 |
| 7 | árbitro de P | acta de P fuera de la ventana permitida | 403 / 409 |
| 8 | árbitro de P | cambiar el marcador oficial o publicar P | 403 |
| 9 | árbitro revocado de P | acta de P | 403, en la siguiente petición y sin cerrar sesión |
| 10 | membership revocada (admin o delegado) | cualquier escritura en su antiguo ámbito | 403 |
| 11 | admin de A | darse `league_admin` de B, o dar `team_delegate` en un equipo de B | 403 |
| 12 | admin de A | crear otro `league_admin` | 403 (solo `super_admin`) |
| 13 | usuario `public` sin memberships | cualquier lectura privada (solicitudes de registro, acta, finanzas, documentos) | 403 / 404 |
| 14 | anónimo | liga inactiva, partido sin publicar, torneo oculto | 404 |
| 15 | admin de A | IDs mezclados: `team_id` de B con `tournament_id` de A en solicitudes de registro, finanzas o partidos | 403 / 422 |
| 16 | usuario sin entitlement (con Play) | reproducir una grabación `premium` o `unlisted` | 403 |
| 17 | entitlement vencido o revocado | reproducir | 403 |
| 18 | `super_admin` | recurso inexistente | 404 |

**Paridad (fase 1):** con los datos actuales y sin memberships extra, todos los Checker dan el mismo resultado que hoy.

## 7. Decisiones abiertas
1. ¿Una liga puede tener **varios admins** desde el principio, o se empieza con uno y suplentes?
2. **Ventana del árbitro** para capturar el acta: ¿cuántas horas después de terminado el partido?
3. ¿El acta del árbitro necesita **aprobación** del admin antes de afectar sanciones?
4. ¿El dueño actual del equipo (`owner_id`) se presenta como "delegado principal" o como un rol aparte de "dueño"?
5. ¿Hace falta un rol de **solo lectura** de liga (por ejemplo, un comité disciplinario)? Se puede agregar al enum sin cambiar el modelo.
6. **Asignación de árbitros:** ¿por invitación con correo o solo por admin, con cuenta ya creada?

## 8. Hallazgos de la revisión (fuera de este ADR)
Problemas que ya existen hoy y que no esperan a las memberships:

| Severidad | Hallazgo | Dónde |
|---|---|---|
| **P1 seguridad** | `GET /teams/{teamID}/player-registration-requests` solo revisa permisos si quien llama es `team_owner`. Cualquier otro usuario con sesión, incluidos `public` y admins de otra liga, ve las solicitudes de cualquier equipo, con nombre y **fecha de nacimiento** | `teams/service.go:412`, `teams/handler.go:56` |
| P2 | `GET /player-registration-requests/{id}` sin permiso responde 500 en vez de 403 | `teams/service.go:404` |
| P2 | Crear una liga escribe `leagues.admin_id`, pero no `users.league_id`. En Flutter, ese admin ve el panel roto (en la web funciona) | `leagues/repository.go`, Flutter `user.leagueId` |
| P2 | El directorio del admin de liga usa `caller.LeagueID`: con varias ligas solo ve una, y con `NULL` no ve ninguna | `directory/service.go:32` |
| P2 | Un admin de liga no puede editar dueños de equipo con `users.league_id` en `NULL` | `accounts/service.go:116` |
| P3 | El comentario dice que el dueño de equipo puede leer el acta, pero el código solo deja al admin. La web del dueño la pide y recibe 403 | `matches/service.go:474`, `team-owner/api-reads.ts` |

Los hallazgos de Play (`mux_stream_key`, premium y operaciones sin liga) ya están en #38, #39 y #40.

## 9. Consecuencias
- **A favor:**
  - No se duplican usuarios.
  - Checker ya está centrado en recursos, así que el cambio se concentra en sus queries y en unas cuantas rutas con `RequireRole`.
  - Los cambios de permisos aplican en la siguiente petición.
- **En contra:**
  - Durante la fase 2 conviven el rol heredado y las memberships. Hay que mantener la doble escritura y llenar los campos heredados de `/me`.
  - La app Flutter necesita un trabajo real de selector de contexto.
- **Riesgo controlado:** nada se aplica antes de enero. La fase 1 se valida con pruebas de paridad y su rollback es de código, sin perder datos.
