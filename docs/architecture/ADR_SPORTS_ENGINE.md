# ADR: Sports Engine: reglas por deporte y piloto de voleibol

**Estado:** Propuesta, pendiente de aprobación. Issue #45.
**Fecha:** 2026-11-17
**Alcance:** diseño. **Nada se implementa antes del lanzamiento de enero de 2027**; el piloto de voleibol va después de estabilizar el fútbol.
**Relacionado:** [`ZONA_OS_ARCHITECTURE.md`](ZONA_OS_ARCHITECTURE.md) §5 y [`ADR_MEMBERSHIPS.md`](ADR_MEMBERSHIPS.md).

## 1. Contexto: qué es común y qué es fútbol hoy

**No existe ninguna columna de deporte.** Todo el sistema asume fútbol. Separando lo que ya es neutral de lo que no:

| Área | Ya es neutral | Es fútbol |
|---|---|---|
| **Competición** | `leagues`; `tournaments.tournament_format` (league, knockout, group_knockout), grupos, vueltas, tercer lugar; reglas de plantel y edad | — |
| **Encuentro** | `matches`: fecha, hora, cancha, `round`, `phase`, `leg`, `playoff_round`, `bye_team_id`, `match_status`, `is_published` | `home_score`/`away_score` como **un solo marcador**; minutos 1..120 en los eventos |
| **Eventos** | `match_incidents` (tipo libre) | `match_goals` (`goal_type` con autogol y penal), `match_cards` (amarilla y roja), `match_referee_reports` (árbitro, asistentes y cuarto árbitro) |
| **Clasificación** | `team_stats` como **proyección reconstruible** (partidos + ajustes manuales, migración 00010) | `points` es una **columna generada `won*3 + drawn`**; empates; `goals_for/against`, `goal_difference`, `clean_sheets`; desempate puntos → diferencia → goles a favor, **repetido en al menos 7 lugares** (SQL, Go y Flutter) |
| **Jugadores** | `player_stats.minutes_played`, asistencia QR | goles, asistencias, tarjetas (`LEAST(yellow,2)`, `LEAST(red,1)`) |
| **Disciplina** | `player_suspensions` (estado, partidos por cumplir), `suspension_match_applications` | trigger: roja = 1 partido; `check_yellow_card_accumulation` (5 amarillas) **sin uso** |
| **Calendario** | generador round robin con descanso y grupos (`FixtureGenerator`) | duración del turno = 2 tiempos + medio tiempo (`FixtureSchedule.half_minutes`) |
| **Liguilla** | emparejamientos por siembra 1v8, 4v5…, ida y vuelta | sin desempate en eliminatoria: no hay penales, global ni avance de ganador |
| **Finanzas** | montos por liga (`finance_config`) | tipos de multa por tarjeta |
| **Clientes** | — | captura de goles y tarjetas; columnas PJ/PG/PE/PP/GF/GC/DG/PTS en web y Flutter (Flutter además reordena la tabla) |

## 2. Decisión

### 2.1 El deporte pertenece al torneo
- **Nueva columna `tournaments.sport`**, por defecto `'football'`, con FK a un catálogo `sports`.
- Una **liga** puede tener torneos de distintos deportes: un club con fútbol y voleibol. Las reglas se aplican por competición, así que el deporte va en el torneo y no en la liga.
- **No se cambia de deporte** a un torneo que ya tiene partidos: hay una restricción en la migración y una validación en el servicio.

### 2.2 Reglas en Go, por deporte (`Ruleset`)
Partiendo del borrador de la arquitectura, la interfaz queda **acotada a lo que el voleibol de verdad necesita**:

```go
// Package sports. One implementation per sport; football first.
type Ruleset interface {
	Sport() string // "football", "volleyball"

	// ValidateResult checks a result before it is stored: football accepts
	// draws and any non-negative score; volleyball needs the set scores to
	// form a valid best-of-N match.
	ValidateResult(cfg CompetitionConfig, r Result) error

	// MatchPoints is what each side earns for one finished match.
	// Football: 3/1/0. Volleyball (FIVB): 3-0 or 3-1 -> 3/0, 3-2 -> 2/1.
	MatchPoints(cfg CompetitionConfig, r Result) (home, away int)

	// Tiebreakers is the standings order after points, as typed keys the
	// projection exposes (no free-form expressions).
	Tiebreakers() []StandingKey

	// SlotMinutes is how long a match occupies a field when scheduling.
	SlotMinutes(cfg CompetitionConfig) int
}
```

- **Fuera de la interfaz** quedan los eventos (goles, tarjetas), las suspensiones y las multas. Siguen siendo **del fútbol** y se activan solo en torneos de fútbol. No se generalizan hasta que un segundo deporte los necesite de verdad.
- **El marcador del encuentro** (`matches.home_score`/`away_score`) se conserva como el **resultado principal en la unidad del deporte**: goles en fútbol, **sets ganados** en voleibol. Así siguen funcionando el portal, los listados, el MCP y la liguilla, que solo necesitan saber quién ganó y por cuánto.
- **Lo que no cabe en un número** va en tablas **tipadas**, no en JSON: los sets van en `match_periods`.

### 2.3 Tabla de posiciones
- **Columnas comunes de `team_stats`:** se mantiene como proyección común (jugados, ganados, perdidos, ajustes). Los empates solo aplican si el deporte los permite.
- **Puntos por partido:** se calculan con `Ruleset.MatchPoints` y se guardan en una columna **normal** (`points_earned`), que reemplaza a la generada `won*3 + drawn`. El voleibol no puede expresarse con ganados y empatados: un 3-2 da 2 puntos al ganador y 1 al perdedor.
- **Métricas propias de cada deporte:** van en una tabla tipada por deporte (`team_stats_volleyball`: sets y puntos a favor y en contra), **no** en una tabla genérica clave-valor.
- **El orden de la tabla** se calcula en **un solo lugar** del backend, con `Tiebreakers()`. Los otros 6 lugares que hoy ordenan por su cuenta (SQL de la vista, agente, knowledge, `stats`, `matches` y Flutter) pasan a consumir ese orden.

### 2.4 Lo que no cambia
- El fútbol es la **primera implementación** y su comportamiento queda congelado por las pruebas de paridad (§5).
- **No se reescribe `00001_baseline.sql`.** Todo cambio va en migraciones nuevas.
- **No hay motor genérico en JSON**, ni tablas genéricas de eventos o métricas.

## 3. Alternativas descartadas

| Alternativa | Por qué no |
|---|---|
| Resultado como JSON libre (`matches.result jsonb`) | Pierde las restricciones de integridad (criterio del issue). Cada lector reinterpreta el JSON |
| Tabla genérica de métricas (`metric`, `value`) | Mismo problema: sin tipos ni CHECK, y consultas de tabla ilegibles |
| Deporte en la liga | Impide una liga con torneos de fútbol y voleibol, y las reglas viven en la competición |
| Una app o servicio por deporte | Duplica ligas, equipos, jugadores, permisos y finanzas. La arquitectura pide un monolito modular |
| Reglas solo en SQL (una función `rebuild` por deporte) | Hoy el fútbol ya tiene sus reglas repartidas en 7 lugares. Centralizarlas en Go deja un solo punto que probar; la SQL queda como proyección |
| Generalizar goles y tarjetas como "eventos" ya | Sin un segundo deporte que los use, sería adivinar. El piloto de voleibol no los necesita |

## 4. Modelo de datos propuesto

Migraciones nuevas, **después de enero**. El SQL se validó contra el esquema actual (00001–00013) en PostgreSQL 16, dentro de una transacción con `ROLLBACK`.

```sql
-- Catalog: one row per supported sport.
CREATE TABLE public.sports (
    id   text PRIMARY KEY CHECK (id ~ '^[a-z_]+$'),
    name text NOT NULL
);
INSERT INTO public.sports (id, name) VALUES ('football', 'Fútbol'), ('volleyball', 'Voleibol');

-- Expand: every existing tournament is football; nothing else changes.
ALTER TABLE public.tournaments
    ADD COLUMN sport text NOT NULL DEFAULT 'football' REFERENCES public.sports(id);

-- Volleyball competition settings, typed (football keeps its columns).
ALTER TABLE public.tournaments
    ADD COLUMN sets_to_win      smallint CHECK (sets_to_win IN (2, 3)),        -- best of 3 or 5
    ADD COLUMN set_points       smallint CHECK (set_points BETWEEN 15 AND 30), -- usually 25
    ADD COLUMN tiebreak_points  smallint CHECK (tiebreak_points BETWEEN 10 AND 25), -- usually 15
    ADD CONSTRAINT tournament_sport_settings CHECK (
        sport <> 'volleyball' OR (sets_to_win IS NOT NULL AND set_points IS NOT NULL AND tiebreak_points IS NOT NULL));

-- Periods of a match: volleyball sets now; halves or quarters could use it later.
CREATE TABLE public.match_periods (
    match_id    uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    period_no   smallint NOT NULL CHECK (period_no BETWEEN 1 AND 9),
    home_points smallint NOT NULL CHECK (home_points >= 0),
    away_points smallint NOT NULL CHECK (away_points >= 0),
    PRIMARY KEY (match_id, period_no),
    CHECK (home_points <> away_points) -- a period always has a winner
);

-- Volleyball standings metrics, typed, next to the common team_stats row.
CREATE TABLE public.team_stats_volleyball (
    tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id       uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    sets_won      int NOT NULL DEFAULT 0 CHECK (sets_won >= 0),
    sets_lost     int NOT NULL DEFAULT 0 CHECK (sets_lost >= 0),
    points_won    int NOT NULL DEFAULT 0 CHECK (points_won >= 0),
    points_lost   int NOT NULL DEFAULT 0 CHECK (points_lost >= 0),
    PRIMARY KEY (tournament_id, team_id)
);

-- Points stop being "won*3 + drawn": a plain column the rebuild fills from
-- Ruleset.MatchPoints. Expand step only; the generated column goes later.
ALTER TABLE public.team_stats ADD COLUMN points_earned int;
```

Reglas que dependen del deporte y no caben en un `CHECK` estático (set ganado por 2 puntos, 25 o 15 puntos, cuántos sets se juegan) **las valida `Ruleset.ValidateResult` en Go**, igual que hoy el servicio valida el resultado del fútbol. La base garantiza la estructura; Go, la regla.

## 5. Paridad del fútbol (antes de tocar nada)

### 5.1 Pruebas que ya fijan el comportamiento
| Comportamiento | Prueba |
|---|---|
| 3 puntos por victoria, recalcular al corregir y al borrar jornada | `matches/admin_ops_integration_test.go` `TestScoreEditAndRoundDeleteKeepStandingsRight` |
| Orden con ajuste de puntos | `stats/repository_integration_test.go:18` |
| Tabla tras borrar un equipo, ajustes conservados | `teams/delete_integration_test.go:21` |
| Ediciones manuales sobreviven al recálculo | `statsadmin/statsadmin_integration_test.go` `TestStandingsEditSurvivesRebuild` |
| Estadísticas de jugador desde eventos; autogol no cuenta | `matches/result_integration_test.go` `TestPostResultFeedsPlayerStats` |
| Roja = 1 suspensión, idempotente | `matches/result_integration_test.go` `TestPostResultIsIdempotent` |
| Reabrir deja la tabla igual que antes | `matches/reopen_integration_test.go` `TestReopenMatch` |
| Round robin par, impar con descanso, ida y vuelta | `matches/handler_test.go` `TestFixtureGenerator_*` |
| Grupos sin cruces ni choques de horario | `matches/fixtures_preview_integration_test.go` |
| Llaves de liguilla 4/8, ida y vuelta, tercer lugar | `matches/handler_test.go` `TestPlayoffBracketBuilder`; `TestPlayoffsWithExplicitSeeding` |
| Jornada completa por API con dos ligas | `cmd/api/matchday_integration_test.go` `TestMatchdayRehearsalTwoLeagues` |

### 5.2 Huecos a cubrir antes de introducir `Ruleset`
1. **Empate = 1 punto a cada uno** y `matches_drawn`, con una tabla de varios partidos.
2. **Orden de desempate completo:** puntos → diferencia de goles → goles a favor, con tres equipos empatados a puntos.
3. **`clean_sheets`, márgenes y `recent_form`** tras varios resultados.
4. **Tabla del portal público = tabla del admin = tabla del agente.** Hoy son 7 consultas distintas.

La fase 1 (§7) solo empieza con estas pruebas en verde. Esas mismas pruebas, sin cambios, deben pasar con el `FootballRuleset`.

## 6. Piloto de voleibol

**Objetivo:** probar que la estructura de competición (liga, torneo, jornadas, grupos, liguilla, asistencia, permisos) funciona con otras reglas **sin inventar goles ni tarjetas**.

| Tema | Regla del piloto |
|---|---|
| **Formato** | Mejor de 5 (`sets_to_win = 3`) o de 3 (`= 2`); sets a 25, el último a 15; se gana por 2 puntos |
| **Resultado** | Marcador por set en `match_periods`. `home_score`/`away_score` = sets ganados (p. ej., 3-1). **Sin empates** |
| **Validación** | Ningún set después de decidido el partido; el set ganado llega al tope y gana por 2 (o más allá del tope por exactamente 2); el último set con su tope propio |
| **Puntos (FIVB)** | 3-0 o 3-1: 3 al ganador y 0 al perdedor; 3-2: 2 y 1. En mejor de 3: 2-0, 3 y 0; 2-1, 2 y 1 |
| **Desempate** | Puntos → partidos ganados → cociente de sets → cociente de puntos |
| **Captura** | Web: marcador por set. Sin goleadores ni tarjetas |
| **Tabla** | PJ, PG, PP, Pts, sets a favor y en contra, cociente; sin columnas de goles ni empates |
| **Calendario** | Mismo round robin y grupos. El turno usa `SlotMinutes` (configurable; p. ej., 90) en lugar de los tiempos de fútbol |
| **Fuera del piloto** | Rotaciones, sustituciones, estadísticas individuales, sanciones de voleibol y deportes individuales |

**Criterio de extensibilidad:** el piloto se considera exitoso si agregar el voleibol **no** requiere cambiar:
- las tablas de ligas, equipos, jugadores, asistencia ni permisos;
- el generador de jornadas;
- la liguilla;
- las rutas existentes del fútbol.

Y además, si todas las pruebas de paridad del fútbol siguen en verde.

## 7. Plan de migración (expand → migrate → contract)

| Fase | Cuándo | Qué |
|---|---|---|
| **0** | Antes de enero | Nada de este ADR. Solo los hallazgos de fútbol (§8) que se decida atender, cada uno en su issue |
| **1: paridad** | Tras estabilizar | Pruebas de §5.2 |
| **2: expand** | Tras la 1 | Migración de §4 (todo `football` por defecto). `FootballRuleset` con las reglas actuales. Un solo cálculo de orden en el backend. `points_earned` se llena junto a la columna generada y **se compara en las pruebas** |
| **3: migrate** | Tras la 2 | Lectores (`stats`, portal, agente, knowledge, MCP, Flutter) usan el orden y `points_earned` del backend. Web y Flutter eligen la captura y las columnas por `tournament.sport` |
| **4: piloto** | Tras la 3 | `VolleyballRuleset`, captura por sets y tabla de voleibol, con una liga de prueba |
| **5: contract** | Tras observar | Se elimina la columna generada `points` (ADR aparte). El trigger de roja y las multas por tarjeta se limitan a torneos de fútbol |

**Rollback:**
- **Fase 2:** las columnas y tablas nuevas son aditivas; se revierte el código.
- **Fase 3:** el cambio en los lectores se puede revertir porque `points` sigue existiendo hasta la fase 5.

## 8. Hallazgos de fútbol encontrados al revisar (fuera de este ADR)

| Severidad | Hallazgo | Dónde |
|---|---|---|
| **P1 (enero)** | **Las suspensiones nunca se cumplen solas:** nada incrementa `matches_served`. "Aplicar a partido" solo registra la aplicación (`stats/repository.go:442`). Una suspensión de varios partidos sigue activa hasta que el admin la da por cumplida a mano | `stats/repository.go`, `player_suspensions` |
| P2 | **La acumulación de amarillas no genera suspensión:** `check_yellow_card_accumulation` existe pero nada la llama | baseline:390 |
| P2 | **Liguilla sin desempate:** no hay penales, global ni avance del ganador; las rondas siguientes son marcadores de posición | `matches/service.go` `PlayoffBracketBuilder` |
| P2 | **El backend no valida que los goles coincidan con el marcador;** solo lo hacen la web y Flutter | `matches/matches.go:349` |
| P3 | **El orden de la tabla está repetido en 7 lugares,** incluido Flutter, que reordena por su cuenta | §1 |
| P3 | **El tipo `TournamentFormat` de la web** (`round_robin` \| `groups`) no coincide con los valores del backend (`league` \| `group_knockout`) | `web/src/features/leagues/types.ts:19` |

## 9. Decisiones abiertas
1. **Formato del piloto:** ¿mejor de 3 o de 5 por defecto? ¿Configurable por torneo, como propone §4?
2. **Puntos del voleibol:** ¿FIVB (3/2/1/0) o simple (2 por victoria, 0 por derrota)? El `Ruleset` admite ambos con una opción.
3. **Liga del piloto:** ¿una liga real o una de prueba?
4. **Duración del turno de voleibol** para el calendario.
5. **Liguilla de fútbol:** ¿cómo se resuelve un empate en eliminatoria (penales, global, gol de visitante)? Afecta el diseño de la liguilla para ambos deportes.
