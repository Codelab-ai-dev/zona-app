# Zona OS — Roadmap a enero de 2027 y evolución multideporte

**Corte:** 2026-11-12. Las fechas son hitos de planificación, no compromisos de despliegue. El proyecto arranca operación con ligas reales en enero de 2027. Mantener dos carriles: **release fútbol** y **evolución Sports Engine**.

## Carril A — Enero 2027: operación segura

| Periodo | Objetivos | Criterio de salida |
| --- | --- | --- |
| Nov 12–22 | Auditoría P0 Play, protección de stream keys, premium, clips y pruebas de autorización; definición de arquitectura y flujo de jornada | API pública sin secretos; permisos verificados con pruebas; ADR inicial revisada |
| Nov 23–Dic 6 | Contrato Match→Play; corregir inconsistencias de IDs deportivos; smoke tests E2E de fútbol; política SSE | Partido, stream y video vinculados sin duplicar autoridad del marcador |
| Dic 7–20 | Ensayos con las ligas confirmadas, datos reales de prueba, dispositivos Flutter, CI móvil, backup + restore drill, capacitación operativa | Una jornada completa de principio a fin ejecutable por responsables reales |
| Dic 21–31 | Congelamiento funcional/estructural; observabilidad; pruebas de regresión; plan de soporte y contingencia | Go/no-go documentado, procedimiento de revert y restauración |
| Enero 2027 | Operación de ligas, seguimiento de errores, hotfixes aislados, métricas de tiempo y confiabilidad | Jornadas registradas y datos consistentes; sin incidentes críticos abiertos |

### Criterios go/no-go

- [ ] Dos ligas independientes y usuarios de roles diferentes no pueden leer o modificar datos privados ajenos.
- [ ] Crear torneo, registrar equipos/jugadores, publicar fixture, registrar resultado y recalcular estadísticas sin inconsistencias.
- [ ] Flujo de asistencia QR desde móvil validado en cancha.
- [ ] Backups y recuperación probados con base restaurada.
- [ ] Ninguna clave de transmisión incluida en respuesta pública.
- [ ] Contenido premium/privado no disponible a usuarios no autorizados.
- [ ] Frontend y backend CI verde; flujo móvil verificado.
- [ ] Administradores de las ligas prueban jornada simulada.
- [ ] Existe soporte y procedimiento manual para incidencias operativas.

Zona Play avanzada, otros deportes, rediseño visual grande y agente de IA no bloquean la operación de ligas.

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
- Cambiar rutas públicas de ligas sin alias o redirecciones.
- Implementar cinco disciplinas simultáneamente.

## Indicadores de calidad del piloto

- **Integridad:** 0 eventos deportivos vinculados a liga/partido incorrecto en datasets de validación.
- **Seguridad:** 0 respuestas públicas con stream keys o contenido premium no autorizado.
- **Operación:** completar ensayo de jornada con al menos dos ligas.
- **Disponibilidad:** healthchecks y registros suficientes para distinguir fallos de Go, PostgreSQL, Mux y WhatsApp.
- **Mantenibilidad:** regresión automatizada de fixtures, resultados, rankings, autorizaciones y roles.

## Orden de backlog sugerido

1. P0 redacción de secretos públicos en Play.
2. P0 política de visibilidad y autorización de Play (grabaciones, streams y clips).
3. P1 validación de relaciones deportivas entre video y partido.
4. P1 E2E de jornada y aislamiento entre dos ligas.
5. P1 CI Flutter y validación móvil.
6. P1 revisión SSE vs timeout.
7. P2 ADR de roles deportivos y memberships.
8. P2 especificación de Sports Engine multideporte y piloto de voleibol.

Cada issue debe ser independiente, incluir archivos de referencia, tests exigidos, exclusiones y criterios de aceptación. Cada PR pequeño y revisable. Claude Code implementa, el autor revisa y valida antes de merge.
