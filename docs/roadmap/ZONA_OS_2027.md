# Zona OS — Roadmap a enero de 2027 y evolución multideporte

**Corte:** 2026-11-12. Las fechas son hitos de planificación, no compromisos de despliegue. El proyecto arranca operación con ligas reales en enero de 2027. Mantener dos carriles: **release Zona Gol (fútbol)** y **evolución Sports Engine**. **Zona Play está pospuesto y no se ofrecerá a las ligas de enero.**

## Carril A — Enero 2027: operación segura

| Periodo | Objetivos | Criterio de salida |
| --- | --- | --- |
| Nov 12–22 | Auditoría funcional de Zona Gol, permisos y aislamiento multi-liga; definición de arquitectura y flujo de jornada | Flujos críticos identificados, pruebas de permisos Gol y ADR revisada |
| Nov 23–Dic 6 | Fortalecer fixtures, resultados, estadísticas, sanciones, asistencia y compatibilidad web/móvil; revisar SSE | Jornada de fútbol consistente, desde calendario hasta resultado, sin dependencia de Play |
| Dic 7–20 | Ensayos con las ligas confirmadas, datos reales de prueba, dispositivos Flutter, CI móvil, backup + restore drill, capacitación operativa | Una jornada completa de principio a fin ejecutable por responsables reales |
| Dic 21–31 | Congelamiento funcional/estructural; observabilidad; pruebas de regresión; plan de soporte y contingencia | Go/no-go documentado, procedimiento de revert y restauración |
| Enero 2027 | Operación de ligas, seguimiento de errores, hotfixes aislados, métricas de tiempo y confiabilidad | Jornadas registradas y datos consistentes; sin incidentes críticos abiertos |

### Criterios go/no-go

- [ ] Dos ligas independientes y usuarios de roles diferentes no pueden leer o modificar datos privados ajenos.
- [ ] Crear torneo, registrar equipos/jugadores, publicar fixture, registrar resultado y recalcular estadísticas sin inconsistencias.
- [ ] Flujo de asistencia QR desde móvil validado en cancha.
- [ ] Backups y recuperación probados con base restaurada.
- [ ] Zona Play no se ofrece ni figura como requisito de las ligas piloto.
- [ ] Si Play está desplegado, el acceso público queda inhabilitado o aislado hasta resolver sus hallazgos de seguridad (requiere validación explícita de despliegue).
- [ ] Frontend y backend CI verde; flujo móvil verificado.
- [ ] Administradores de las ligas prueban jornada simulada.
- [ ] Existe soporte y procedimiento manual para incidencias operativas.

Zona Play, otros deportes, rediseño visual grande y agente de IA **no forman parte** de la oferta de enero ni bloquean la operación de las ligas.

## Carril B — Zona OS Sports Engine (sin arriesgar enero)

1. **Discovery de reglas deportivas:** identificar SQL/DTOs y reglas de fútbol, incluidas clasificaciones, goles, tarjetas, sanciones, fixtures y fases.
2. **Modelo conceptual:** Sport, Competition, Entry/Participant, Encounter, Result, Ruleset; precisar qué es universal y qué es fútbol.
3. **ADRs y pruebas de paridad:** registrar invariantes, reglas actuales, migraciones y comportamiento que no puede cambiar antes de enero.
4. **Adaptador fútbol:** introducir interfaces pequeñas donde exista al menos una segunda implementación conceptual o prueba, sin migración big-bang.
5. **Piloto voleibol posterior al lanzamiento:** validación con sets y puntos; decidir después el soporte de competidores individuales.

### No hacer antes de enero

- Migrar todas las tablas `public` a nuevos schemas.
- Sustituir de una vez `matches`, `match_goals` o tablas de standings.
- Crear motor genérico de torneos basado exclusivamente en JSON.
- Separar Play o Gol en nuevos microservicios.
- Implementar o integrar Zona Play en el lanzamiento.
- Cambiar rutas públicas de ligas sin alias o redirecciones.
- Implementar cinco disciplinas simultáneamente.

## Indicadores de calidad del piloto

- **Integridad:** 0 resultados o registros deportivos vinculados a liga/partido incorrecto en datasets de validación.
- **Seguridad:** 0 accesos no autorizados entre ligas; Zona Play fuera de la oferta y del acceso público de enero.
- **Operación:** completar ensayo de jornada con al menos dos ligas.
- **Disponibilidad:** healthchecks y registros suficientes para distinguir fallos de Go, PostgreSQL y notificaciones cuando estén habilitadas.
- **Mantenibilidad:** regresión automatizada de fixtures, resultados, rankings, autorizaciones y roles.

## Orden de backlog sugerido

1. P1 E2E de jornada y aislamiento entre dos ligas (#41).
2. P1 CI Flutter y validación móvil (#42).
3. P1 revisión SSE vs timeout (#43).
4. P2 ADR de roles deportivos y memberships (#44), sin alterar roles de enero antes de validar compatibilidad.
5. P2 especificación de Sports Engine multideporte (#45); implementar piloto voleibol posteriormente.

### Backlog diferido: Zona Play

- #38 Seguridad de claves Mux; **bloqueante antes de exponer Play al público**, no para la oferta Gol de enero.
- #39 Control de reproducción privada/premium; **bloqueante antes de habilitar Play**.
- #40 Integridad de referencias Gol/Play; pendiente cuando se reactive integración.

**Advertencia operativa:** posponer desarrollo no deshabilita endpoints. Antes del lanzamiento, verificar si los endpoints Play existentes están realmente expuestos y restringir/deshabilitar su acceso en despliegue mediante un cambio técnico explícito. No afirmar que el módulo está apagado sin comprobarlo.

Cada issue debe ser independiente, incluir archivos de referencia, tests exigidos, exclusiones y criterios de aceptación. Cada PR pequeño y revisable. Claude Code implementa, el autor revisa y valida antes de merge.
