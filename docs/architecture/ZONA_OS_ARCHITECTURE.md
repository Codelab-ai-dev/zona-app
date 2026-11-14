# Zona OS — Arquitectura maestra del ecosistema deportivo

**Estado:** Propuesta (ADR pendiente de aprobación)  
**Base revisada:** `main` @ `1bad17a19c780c8b00f4fa8848ac73dcf6c63491` (2026-11-12)  
**Primer hito operativo:** lanzamiento exclusivo de Zona Gol para las ligas de fútbol amateur en enero de 2027.

> **Decisión de producto (2026-11-12):** Zona Play queda **pospuesto**. No se ofrecerán transmisiones, grabaciones ni clips a las ligas que inician en enero; no se planificará trabajo de nuevas funciones o integraciones Play para esa entrega. El código existente permanece en el repositorio. Antes de cualquier futura exposición pública de Play se deberán revisar y corregir los hallazgos de seguridad documentados.

## 1. Visión y límites

Zona OS es la plataforma compartida para operar y conectar aplicaciones deportivas, inicialmente de fútbol amateur, con una evolución **multidisciplinaria** sin comprometer el lanzamiento de enero.

- **Zona Gol**: gestión de competiciones, ligas, torneos, inscripciones, equipos, jugadores, calendarios, resultados, clasificación, disciplina, asistencia y operaciones económicas propias de las ligas.
- **Zona Play**: medios vinculados a los partidos: transmisiones, grabaciones, clips, metadatos y derechos de visualización.
- **Zona Gol Mobile**: interfaz de operación y consulta sobre los mismos servicios Go, útil especialmente para actividades en cancha.
- **Zona OS Core**: identidad, relaciones deportivas y permisos, servicios técnicos compartidos, contratos y eventos.

**Fuera de alcance:** ERP, POS, inventarios, compras empresariales, microservicios por defecto, marketplace de código ejecutable y soporte terminado para todos los deportes antes de enero.

## 2. Situación actual verificada

- Backend Go con Chi, PostgreSQL 16, pgx, Goose y paquetes de dominio (`backend/internal/{leagues,teams,matches,play,...}`).
- La interfaz `server.Module` solamente define `Routes(chi.Router)`; los handlers se registran estáticamente en `cmd/api/main.go`.
- Web React + Vite, áreas funcionales en `web/src/app/area.ts` y `router.tsx`. Zona Play ya tiene páginas propias.
- Flutter utiliza `/api/v1` con access/refresh tokens.
- Los modelos deportivos y las reglas actuales son específicos del fútbol.
- Backend y web pasaron CI en el commit de referencia; esto no equivale a una validación en producción.
- **Estado de evolución:** modularidad de código existente; **no** hay todavía un motor de reglas para varios deportes ni un esquema de roles deportivos de múltiple pertenencia.

## 3. Decisiones arquitectónicas propuestas

1. **Monolito modular** en Go, una API y PostgreSQL; separar procesos únicamente por necesidades de carga/fallo medibles.
2. **Una identidad global, roles por ámbito**: una persona puede ser administradora de una liga, encargada de un equipo y participante en otra. Los permisos son evaluados **en servidor**, asociados a recursos concretos.
3. **Fuente única de verdad para datos deportivos**: el resultado y calendario oficiales pertenecen a Zona Gol; el contenido audiovisual y su ciclo de vida a Zona Play.
4. **Sports Engine incremental**: abstraer lo común únicamente después de identificar invariantes y probar una segunda disciplina. Fútbol continúa como primera implementación, sin sustituir migraciones vigentes.
5. **Contratos API explícitos** entre web, móvil y Go, con pruebas de compatibilidad; mantener rutas existentes y compatibilidad de datos.
6. **Eventos de dominio con entrega durable** cuando exista un consumidor real; inicialmente PostgreSQL transactional outbox y worker Go, sin Kafka/NATS.
7. **Seguridad y aislamiento**: priorizar roles, permisos y aislamiento de datos de las ligas de fútbol. Los hallazgos específicos de Play quedan registrados como **bloqueantes para su futura activación pública**, no para la entrega de Zona Gol de enero.
8. **Lanzamiento protegido**: nuevas abstracciones detrás de pruebas y, cuando proceda, feature flags; desde diciembre limitar cambios de alto riesgo.

## 4. Límites y responsabilidades

| Subdominio | Autoridad sobre escritura | Consumidores |
|---|---|---|
| Identity & Access | OS Core | Gol, Play, web, móvil |
| Liga/Torneo | Zona Gol | Play, IA, notificaciones |
| Equipo/Jugador/Inscripción | Zona Gol | Play, móvil |
| Partido, calendario y resultado oficial | Zona Gol | Play, móvil, portal, IA |
| Estadísticas/Disciplina/Asistencia | Zona Gol | Móvil, portal, IA |
| Stream/Grabación/Clip/Playback access | Zona Play | Gol, portal, móvil |
| Configuración y entrega de mensajes | Servicio compartido | Gol, Play |
| Consultas de IA | Servicio de IA solo lectura inicialmente | Web, móvil, WhatsApp |

**Invariante importante**: un `match_id` identifica un encuentro oficial. Los clips, transmisiones y grabaciones vinculados deben validar que `match_id`, `league_id`, `tournament_id`, `team_id` y `recording_id` son compatibles y visibles al actor correspondiente.

El marcador oficial se consulta desde el partido. No se mantienen marcadores independientes editables como fuente autoritativa de Play.

## 5. Modelo multidisciplinario: principios

### Conceptos transversales candidatos

- `Sport`: deporte y versión de sus reglas.
- `Competition`: liga, torneo, temporada y fases; se conserva el esquema actual durante la transición.
- `Participant`: abstracción que puede representar equipo o persona, **no** significa que todo deporte use equipos.
- `Fixture/Encounter`: enfrentamiento o prueba, según disciplina.
- `Result`: resultado validado según reglas del deporte.
- `Standing`: clasificación calculada mediante reglas aplicables.
- `SportEvent`: acción tipada propia del deporte (gol, tarjeta, punto, set, etc.).

Estos son **conceptos objetivo**, no una instrucción de crear ya tablas genéricas para todos.

### Separación orientativa

```go
// Borrador de contrato, NO código listo para implementar.
type Ruleset interface {
    SportID() string
    Version() string
    ValidateResult(ctx context.Context, competition CompetitionContext, result SportResult) error
    CalculateStandings(ctx context.Context, competition CompetitionContext, results []SportResult) ([]Standing, error)
}
```

El contrato definitivo depende del estudio de modelos, resultados, suspensión, torneos y triggers existentes. No poner todo en JSON sin constraints. Evitar inferir que todos los deportes usan home/away o una tabla idéntica de standings.

**Validación de arquitectura posterior al lanzamiento:** implementar una competición piloto de voleibol por sets para probar si el motor separa realmente reglas y estructura de competición. Un deporte individual se evaluaría después.

## 6. Seguridad y hallazgos pendientes de Zona Play (diferidos para su activación futura)

**No implementar Zona Play en el ciclo de enero de 2027.** Los hallazgos siguientes siguen siendo válidos, pero su prioridad P0/P1 se refiere exclusivamente a **antes de habilitar Zona Play para usuarios**. Evaluar la exposición actual y asegurar que Play no esté accesible al público si no se va a corregir todavía; deshabilitar funcionalidad en despliegue requiere un cambio específico, fuera del alcance de esta documentación.


### P0 — Claves de streaming
En `play.Stream`, `MuxStreamKey` se serializa a JSON. `GET /api/v1/play/streams` y `GET /api/v1/play/streams/{streamId}` son públicos y devuelven objetos `Stream`. Eliminar secretos de DTO públicos y cubrir todas las rutas/estados con pruebas. Rotar claves si se verifica exposición real.

### P0 — Autorización de contenido de pago
`play.Service.GetRecording` considera visible cualquier grabación `ready` cuyo estado no sea `private`, lo que incluye `premium`. Separar política de metadatos, permiso de reproducción y entrega de playback autorizado. Revisar también `unlisted`, clips derivados y streams.

### P1 — Clips sin liga resoluble y relaciones cruzadas
`CreateClip` puede omitir `CanManageLeague` si no se resuelve `leagueID`. Exigir ámbito autorizado y coherencia de todas las referencias asociadas. Probar otros owners y ligas diferentes.

### P1 — Stream de asistencia y timeout
Resuelto en #43. El stream se cortaba por tres límites: `middleware.Timeout(30s)` del router, más el `ReadTimeout` (30 s) y el `WriteTimeout` (60 s) del `http.Server`. Política actual:

- El router aplica el timeout de 30 s a todo, salvo a la lista exacta de rutas SSE (`streamRoutes` en `server/middleware.go`, hoy solo `GET /api/v1/matches/{matchID}/attendance/stream`).
- El handler quita los deadlines del servidor solo para esa conexión. Pone uno de 10 s antes de cada escritura, manda un heartbeat cada 15 s y cierra a los 30 minutos.
- Al desconectarse el cliente, se cancela el poller y el handler espera a que termine. Se mantienen `CanManageMatch` y el máximo de 3 streams por usuario.
- El límite por usuario vive en memoria: con varias réplicas, cada una cuenta aparte.

### P1 — Identidad deportiva
Roles actuales globales: `super_admin`, `league_admin`, `team_owner`, `public`; principal incluye `LeagueID` y `TeamID`. Diseñar memberships por liga/equipo y permisos por partido sin alterar sesiones activas. Propuesta en [`ADR_MEMBERSHIPS.md`](ADR_MEMBERSHIPS.md) (#44): memberships por liga/equipo, asignaciones de árbitro por partido y entitlements diferidos, con expand → migrate → contract después de enero.

Otros controles: firmar/validar webhooks, datos de menores, visibilidad de documentos y derechos de imagen según contexto legal, auditabilidad de resultados y respaldos restaurables.

## 7. Integración Gol ↔ Play: propuesta futura, fuera del lanzamiento de enero

**Caso futuro, no requisito de enero:** jornada conectada de extremo a extremo.

1. El administrador crea/publica un partido en Gol.
2. Play registra una transmisión vinculada al `match_id` autorizado.
3. Flutter y React consultan el calendario y datos oficiales desde la misma API.
4. El resultado se registra de forma transaccional en Gol.
5. Una consulta de Play muestra el marcador oficial, sin copiarlo como autoridad.
6. Una vez procesada la grabación, Play vincula el video y clips al encuentro.
7. El asistente solo consulta información y enlaces de contenido permitidos.

**Contratos a definir antes de codear:** estados de partido y stream, relación con torneos, política public/unlisted/private/premium, permisos del emisor, playback público/privado y sincronización posterior a correcciones.

**Eventos candidatos:** `match.scheduled`, `match.result.published`, `match.result.corrected`, `match.cancelled`, `play.stream.started`, `play.stream.ended`, `play.recording.ready`. No publicar eventos nuevos hasta existir definición de persistencia, idempotencia y consumidores reales.

## 8. API, pruebas y despliegue

- Mantener `/api/v1` y rutas públicas históricas; versión nueva solo para cambios incompatibles.
- Adoptar documentación OpenAPI para endpoints transversales y tipos compartidos web/Flutter.
- Pruebas backend: `go test -race ./...`, `TEST_DATABASE_URL=... go test -tags integration -race ./...`, `go vet ./...`.
- Pruebas web: `npm ci`, `npx tsc -b`, `npx eslint .`, `npx vitest run`, `npx vite build`.
- Móvil: agregar workflow para `flutter analyze`, `flutter test` y build de verificación.
- E2E de enero: dos ligas independientes, administradores cruzados, usuarios móviles y resultados de fútbol. Play/premium no forman parte de la aceptación.
- Backups y restore drill antes de enero. Configurar alertas en fallos de API y base de datos. El procesamiento de video pertenece a la fase posterior de Zona Play.
- No asumir que CI verde implica comportamiento correcto en producción.

## 9. Compatibilidad y migración

**Patrón expand → migrate → contract**:

1. Añadir capacidades sin quitar columnas/roles/rutas existentes.
2. Introducir repositorios/servicios adaptadores; llenar relaciones nuevas sin afectar la operación actual.
3. Correr pruebas de paridad de fútbol y migración en PostgreSQL real.
4. Migrar rutas/frontend gradualmente, preservando links.
5. Eliminar legado solo después del lanzamiento y de un periodo de observación.

No reescribir `00001_baseline.sql`; crear nuevas migraciones Goose. No reorganizar simultáneamente todos los paquetes Go.

## 10. Criterio de preparación de enero 2027

**Obligatorio:** crear y administrar ligas/torneos, equipos, jugadores, fixtures, resultados, estadísticas y sanciones; login/roles; pruebas de aislamiento de ligas; operaciones móviles esenciales; respaldo y restauración probados; simulación integral de jornada y plan de contingencia.

**Fuera de alcance de enero:** cualquier oferta de Zona Play, videos, transmisiones, clips, IA, app shell visual nuevo, deportes adicionales, event bus generalizado y herramientas de emisión.

**Congelamiento:** desde ~21 diciembre, no integrar refactors estructurales de alto riesgo sin necesidad operativa urgente.

## 11. Referencias de implementación

- `backend/CONVENTIONS.md`
- `backend/cmd/api/main.go`
- `backend/internal/server/router.go`
- `backend/internal/auth/principal.go`, `backend/internal/authz/authz.go`
- `backend/internal/matches/service.go`
- `backend/internal/play/{play,handler,service,repository}.go`
- `web/src/app/{area,router}.tsx` (area en `.ts`)
- `web/src/features/play/routes.tsx`
- `zona_gol_mobile/lib/core/network/api_client.dart`
- `.github/workflows/{backend,web}.yml`

## 12. Decisiones pendientes (ADRs futuros)

- Cómo se representan ligas de una federación/operador frente a ligas independientes, sin inventar una jerarquía organizacional innecesaria.
- Si Zona Gol es una marca de fútbol o un administrador universal configurable; la decisión técnica provisional es independizar Core del deporte sin forzar cambio de marca.
- Permisos de árbitros y delegados basados en asignaciones a encuentros. Propuesta: [`ADR_MEMBERSHIPS.md`](ADR_MEMBERSHIPS.md).
- Política de rights/licencias para contenido de menores.
- Criterio de elección de segunda disciplina y cómo representar individual vs equipos.
