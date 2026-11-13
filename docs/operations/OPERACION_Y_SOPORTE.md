# Operación y soporte de Zona Gol

Procedimientos para operar las ligas desde enero de 2027 (issue #41): cómo corregir los errores más comunes de una jornada, cómo respaldar y restaurar los datos, y cómo atender una incidencia. **Zona Play no forma parte de la operación de enero.**

Los comandos `make` se ejecutan en la raíz del repositorio, en el servidor donde corre el stack de `deploy/` (ver `deploy/README.md`).

## 1. Responsables

Llenar antes del primer ensayo con las ligas:

| Función | Persona | Contacto | Horario |
|---|---|---|---|
| Soporte técnico (primer contacto) | | | Días de jornada: desde 1 h antes del primer partido hasta 2 h después del último |
| Respaldo técnico (accede al servidor) | | | |
| Responsable Liga A | | | |
| Responsable Liga B | | | |

## 2. Antes de cada jornada

- [ ] `curl -fsS https://<dominio>/healthz` responde `{"status":"ok"}`.
- [ ] `make ps`: `db`, `api` y `web` aparecen `running (healthy)`.
- [ ] `make backup` del día, con una copia fuera del servidor (ver 4.1).
- [ ] La jornada está **publicada** (en **Calendario**) y los partidos tienen fecha, hora y cancha.
- [ ] Quien opera el escáner en cada cancha puede iniciar sesión en la app móvil.
- [ ] Espacio en disco suficiente: `df -h` (los respaldos crecen con fotos y documentos).

## 3. Errores operativos y cómo corregirlos

Primero corrige desde la web o la app. Los procedimientos SQL de la sección 3.2 son solo para el respaldo técnico, siempre después de un `make backup`.

### 3.1 Desde la web o la app

| Situación | Qué hacer | Qué pasa después |
|---|---|---|
| **Resultado mal capturado** (marcador, goleador o tarjeta) | Vuelve a capturar el resultado completo del mismo partido: web **Resultados** o app **Registrar Resultado**. | Se reemplazan goles, tarjetas e incidentes del partido, y se recalculan la tabla del torneo y las estadísticas de jugadores. Las suspensiones automáticas por roja que **aún no se cumplieron** se rehacen; las que ya llevan partidos cumplidos se conservan y deben revisarse en **Suspensiones**. |
| **Partido pospuesto** | En **Calendario**, cambia la fecha u hora del partido. | Sigue programado en la nueva fecha. |
| **Partido cancelado** | No hay botón en la web ni en la app: lo hace el respaldo técnico (3.2). | Un partido **finalizado** no se puede cancelar; si se finalizó por error, ver 3.2. |
| **Fixture mal generado** | En **Calendario**, **Eliminar jornada** (una jornada) o **Eliminar Calendario** (todo el torneo). Después, vuelve a generarlo en **Jornadas**, revisando primero la vista previa. | Se borran también los partidos ya finalizados de esa jornada o calendario, y la tabla se recalcula. Antes, haz `make backup`. |
| **Equipo con puntos que no cuadran por una sanción administrativa** | **Posiciones** → ajuste manual del equipo, con un motivo. | El ajuste queda registrado con su motivo y se muestra en la tabla. |
| **Suspensión incorrecta** | **Suspensiones** → cancelar o dar por cumplida. | Deja de impedir que el jugador juegue. |
| **Jugador en el equipo equivocado o dado de baja** | Desactiva al jugador y regístralo en el equipo correcto. | Su historial queda en el equipo original. |
| **Escaneo duplicado** | Nada: la app avisa que ya tiene asistencia y no se duplica. | |
| **No deja registrar asistencia: "partido cerrado"** | El partido ya está finalizado o cancelado. Si fue un error, corrige el estado del partido antes (3.2). | |
| **Usuario no puede entrar: "Demasiadas solicitudes"** | Esperar un minuto. Tras 5 intentos fallidos seguidos se admite un intento cada 12 segundos por dispositivo y correo. | El límite se reinicia al entrar bien. |
| **Usuario olvidó su contraseña** | Pantalla de inicio de sesión → **¿Olvidaste tu contraseña?** | Llega un enlace válido por 1 hora. Requiere SMTP configurado; en desarrollo el enlace solo queda en los logs. Para un super admin, `make admin EMAIL=...` también fija una contraseña nueva. |
| **Cuenta desactivada** | La web solo permite desactivar; la reactivación la hace el respaldo técnico (3.2). | La cuenta vuelve a entrar con su contraseña de siempre. |
| **App móvil: "Tu sesión expiró"** | Volver a iniciar sesión. | La sesión dura 30 días sin uso o hasta cerrar sesión. |
| **App móvil no carga datos** | Revisa `/healthz` y que el teléfono tenga internet. | Si `/healthz` falla, es incidencia S1 (sección 5). |

### 3.2 Procedimientos SQL (solo respaldo técnico)

No hay botón para estos casos. Todos se probaron en una base de ensayo. Reglas:

1. `make backup` antes de cualquier cambio.
2. Dos personas: una ejecuta y otra revisa los IDs.
3. Primero, `SELECT` para confirmar que los IDs son los correctos.
4. Registra el cambio en el issue de la incidencia.

Para abrir la consola de la base:

```sh
docker-compose -f deploy/compose.yml --env-file deploy/.env exec db psql -U zona -d zona
```

En hosts con Docker Compose v2 usa `docker compose` (con espacio).

**Resultado capturado en el partido equivocado: regresar el partido a "programado".** Sustituye `<MATCH_ID>` y `<TOURNAMENT_ID>`:

```sql
SELECT m.id, ht.name AS local, at.name AS visita, m.home_score, m.away_score, m.status, m.tournament_id
FROM public.matches m
JOIN public.teams ht ON ht.id = m.home_team_id
JOIN public.teams at ON at.id = m.away_team_id
WHERE m.id = '<MATCH_ID>';

BEGIN;
DELETE FROM public.player_suspensions
 WHERE match_card_id IN (SELECT id FROM public.match_cards WHERE match_id = '<MATCH_ID>')
   AND COALESCE(matches_served, 0) = 0;
DELETE FROM public.match_goals     WHERE match_id = '<MATCH_ID>';
DELETE FROM public.match_cards     WHERE match_id = '<MATCH_ID>';
DELETE FROM public.match_incidents WHERE match_id = '<MATCH_ID>';
UPDATE public.matches SET status = 'scheduled', home_score = 0, away_score = 0, updated_at = now()
 WHERE id = '<MATCH_ID>';
SELECT public.rebuild_match_player_stats('<MATCH_ID>');
SELECT public.rebuild_team_stats_for_tournament('<TOURNAMENT_ID>');
COMMIT;
```

Después captura el resultado en el partido correcto desde la web o la app.

**Asistencia registrada a un jugador equivocado.** Solo funciona en partidos no finalizados:

```sql
SELECT a.id, p.name, a.created_at
FROM public.asistencias_qr a JOIN public.players p ON p.id = a.player_id
WHERE a.match_id = '<MATCH_ID>' AND a.player_id = '<PLAYER_ID>';

BEGIN;
DELETE FROM public.asistencias_qr a
 USING public.matches m
 WHERE a.match_id = m.id AND m.status <> 'finished'
   AND a.match_id = '<MATCH_ID>' AND a.player_id = '<PLAYER_ID>';
COMMIT;
```

**Cancelar un partido** (no finalizado):

```sql
BEGIN;
UPDATE public.matches SET status = 'cancelled', updated_at = now()
 WHERE id = '<MATCH_ID>' AND status <> 'finished';
COMMIT;
```

**Reactivar una cuenta:**

```sql
BEGIN;
UPDATE public.users SET is_active = true, updated_at = now()
 WHERE lower(email) = lower('<CORREO>');
COMMIT;
```

Si un `DELETE` o un `UPDATE` afecta un número de filas distinto del esperado, ejecuta `ROLLBACK;` en lugar de `COMMIT;`.

## 4. Respaldo y restauración

### 4.1 Rutina de respaldo

`make backup` guarda en `backups/<fecha-hora>/`:

- `db.dump`: base completa en formato `pg_dump` custom.
- `media_public.tar.gz`: logos y fotos.
- `media_private.tar.gz`: documentos de identidad (sensibles).
- `SHA256SUMS`: sumas de verificación.

Contienen datos personales. Los permisos son solo para el usuario y `backups/` no se sube a git.

| Cuándo | Qué |
|---|---|
| Diario, de madrugada | `make backup` por cron. |
| Antes de cada jornada | `make backup` manual (sección 2). |
| Antes de cada despliegue o cambio de versión | `make backup`: es el punto de retorno si la versión nueva falla (ver 5.4). |
| Después de cada respaldo | Copiar la carpeta fuera del servidor y conservar al menos 14 días. |

Ejemplo de cron. Ajusta la ruta y el usuario; `make` debe encontrar `docker` en el `PATH`:

```cron
30 3 * * * cd /srv/zona-app && make backup >> /var/log/zona-backup.log 2>&1
```

### 4.2 Simulacro de restauración

Hazlo **antes de enero** y luego cada mes. **Nunca la primera vez en producción:** `make restore` reemplaza los datos del servidor donde se ejecuta. Usa una segunda máquina o VM con el mismo `deploy/` y un `deploy/.env` propio.

1. En producción: `make backup` y copia la carpeta al equipo de simulacro.
2. En el equipo de simulacro: `make up` y luego `make restore FROM=backups/<fecha-hora>`. El script verifica las sumas, pide escribir `restaurar`, detiene la API y la web, reemplaza base y archivos, y vuelve a levantar todo. Al arrancar, la API aplica migraciones pendientes (`MIGRATE_ON_START`), así que un respaldo de una versión anterior queda al día.
3. Verificación:
   - [ ] `/healthz` responde `ok`.
   - [ ] Un admin de cada liga inicia sesión en la web.
   - [ ] La tabla, los goleadores y la última jornada coinciden con producción a la hora del respaldo.
   - [ ] Se ven el logo de una liga y la foto de un jugador (archivos públicos).
   - [ ] Un documento de identidad se puede abrir desde **Verificación** (archivos privados).
   - [ ] La app móvil, apuntando al equipo de simulacro, inicia sesión y ve la jornada.
4. Registra el simulacro:

| Fecha | Respaldo usado | Tamaño | Tiempo de restauración | Verificación | Responsable |
|---|---|---|---|---|---|
| | | | | | |

**Comprobado durante la preparación de esta guía:** un `pg_dump --format=custom --no-owner` de una base con las dos ligas de ensayo, restaurado con `pg_restore --no-owner --exit-on-error` en una base vacía de PostgreSQL 16 con pgvector, conservó cuentas, ligas, equipos, jugadores, partidos, estadísticas y la versión de migraciones. La API arrancó sobre la base restaurada e inició sesión. **Todavía falta** el simulacro completo con `make restore`, que incluye los archivos, en un equipo separado.

## 5. Procedimiento de soporte

### 5.1 Recibir la incidencia

Pide siempre:

- Liga, cuenta (correo) y dispositivo (web o app; modelo de teléfono).
- Qué intentaba hacer, a qué hora y en qué pantalla.
- El mensaje que vio y una captura.
- El partido, equipo o jugador afectado.

### 5.2 Severidad

| Nivel | Ejemplo | Respuesta |
|---|---|---|
| **S1: jornada detenida** | Nadie puede entrar, `/healthz` falla, no se registran resultados ni asistencia en ninguna cancha. | Inmediata. Avisar a los responsables de liga y aplicar el plan B (5.5). |
| **S2: una liga o cancha afectada** | Un admin no puede capturar resultados; el escáner falla en un teléfono. | Durante la jornada. |
| **S3: dato incorrecto o molestia** | Un goleador mal asignado; un nombre mal escrito. | Corregir con la sección 3 después de la jornada. |
| **Seguridad** | Alguien ve o modifica datos de otra liga; se expone un documento. | Tratar como S1: cambiar contraseñas afectadas, revisar logs y abrir un issue privado. |

### 5.3 Diagnóstico

1. `curl -fsS https://<dominio>/healthz` y `make ps`.
2. `make logs`. Cada petición deja una línea con método, ruta, estado, duración y `request_id`, y los errores 5xx dejan una línea `request failed` con la causa. Busca por la hora y la ruta que reportó el usuario.
3. Reproduce en un entorno local con `make seed` (ver `docs/operations/ENSAYO_JORNADA.md`) antes de tocar producción.
4. Corrige desde la web o la app (sección 3.1). SQL solo con la sección 3.2.
5. Abre un issue en GitHub con la información de 5.1, la causa y lo que se hizo. Sin contraseñas, tokens ni documentos.

### 5.4 Revertir un despliegue

1. Vuelve a desplegar el commit o la imagen anterior (`git checkout <commit-anterior>` y `make up`).
2. Las migraciones **no se revierten solas.** Si la versión fallida aplicó una migración que rompe la anterior, restaura el respaldo previo al despliegue con `make restore`. Se pierde lo capturado desde ese respaldo: anótalo para volver a capturarlo.
3. Desde ~21 de diciembre no se despliegan cambios estructurales de alto riesgo (`docs/roadmap/ZONA_OS_2027.md`).

### 5.5 Plan B en cancha

Si el sistema no está disponible durante una jornada:

- Asistencia y resultado en papel: cédula arbitral con los mismos datos que pide la app (jugadores presentes, goles con minuto, tarjetas).
- Al volver el servicio, capturar los resultados desde la web. La asistencia QR no se puede registrar después de finalizar el partido; anota en las observaciones del resultado quiénes asistieron.
- Avisar a los responsables de liga cuando el servicio vuelva.
