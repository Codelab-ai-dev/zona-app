# Zona OS MCP Server — Fase A

Servidor [Model Context Protocol](https://modelcontextprotocol.io) para que clientes de IA (Claude, ChatGPT u otros hosts MCP) consulten **datos deportivos públicos de Zona Gol**. Issue #50.

**Esta fase es una prueba de concepto local.** No forma parte del lanzamiento de enero de 2027, no se despliega y no cambia la API REST, la web ni la app.

## Qué incluye la fase A

- Seis herramientas de **solo lectura** sobre datos públicos.
- Sin autenticación: todas las consultas se hacen como visitante anónimo, con las mismas reglas que el portal público.
- Un binario aparte, `backend/cmd/mcp`, que **no** está en el contenedor de la API ni en `deploy/`.
- Sin Zona Play, sin herramientas de escritura y sin acceso SQL libre.

## Versiones

| Componente | Versión |
|---|---|
| SDK oficial | `github.com/modelcontextprotocol/go-sdk` **v1.8.0** (septiembre de 2026, último estable) |
| Protocolo | Hasta `2026-07-28`. El SDK negocia versiones anteriores (`2025-11-25`, `2025-06-18`, `2025-03-26`, `2024-11-05`) con clientes más viejos. |
| Transportes | **stdio** (por omisión) y **Streamable HTTP** sin sesión, solo en loopback |

## Herramientas

| Herramienta | Entrada | Devuelve | Servicio reutilizado |
|---|---|---|---|
| `search_leagues` | `query?`, `limit?`, `offset?` | Ligas activas cuyo nombre o slug contiene el texto (sin distinguir mayúsculas ni acentos) | `leagues.ListActiveLeagues` |
| `get_tournaments` | `league_id`, `limit?`, `offset?` | Torneos de una liga activa | `leagues.ListTournamentsByLeague` |
| `get_matches` | `tournament_id`, `status?`, `round?`, `phase?`, `from?`, `to?`, `limit?`, `offset?` | Partidos **publicados**, con marcador solo si están en juego o finalizados | `leagues.GetTournamentByID` + `matches.ListMatches` |
| `get_standings` | `tournament_id` | Tabla de posiciones, incluidos los ajustes de puntos y su motivo | `stats.GetStandingsByTournament` |
| `get_top_scorers` | `tournament_id`, `limit?` (1–20) | Goleadores con al menos un gol | `stats.GetTopScorersByTournament` |
| `get_team` | `team_id` | Equipo activo, su liga y su plantel activo (nombre, número y posición) | `teams.GetTeam` + `leagues.GetLeagueByID` + `teams.GetTeamPlayers` |

Todas llevan la anotación `readOnlyHint`. Por página se devuelven entre 1 y 50 resultados (20 por omisión), con `offset` de hasta 10 000.

## Reglas de visibilidad

Las herramientas llaman a los servicios de dominio existentes, que ya aplican las reglas del portal público. No hay SQL propio.

- **Ligas inactivas:** no aparecen en la búsqueda, y sus torneos, partidos, tablas y equipos responden "No encontrado o no es público".
- **Partidos sin publicar:** `matches.ListMatches` los filtra con `visibleMatches`.
- **Equipos:** `teams.GetTeam` no filtra, así que `get_team` comprueba que el equipo esté activo y que su liga sea visible, igual que `stats.ensureVisible`.
- **Siempre anónimo:** cada herramienta descarta los valores del `context` antes de llamar a los servicios. Así ningún principal autenticado puede activar la vista de administrador.
- **Salidas propias:** cada herramienta devuelve DTOs propios con solo los campos que muestra el portal. Nunca incluye `admin_id`, `owner_id`, `product_mode`, fecha de nacimiento, fotos de jugadores, documentos, verificaciones ni datos de contacto. Un campo privado que se agregue después a un tipo de dominio no se expone solo.
- **Errores:** un recurso oculto y uno inexistente dan el mismo mensaje, para no revelar que existe. Los errores internos se registran en el log y el cliente solo ve "Error interno".

## Protecciones del binario

- No arranca sin `MCP_ENABLED=true`.
- No arranca con `APP_ENV=production`.
- Con `-http`, solo escucha en `127.0.0.1`, `::1` o `localhost`. El SDK además valida `Host`/`Origin` contra DNS rebinding en loopback.
- La conexión a PostgreSQL se abre con `default_transaction_read_only=on`: aunque una herramienta tuviera un error, la base rechaza cualquier escritura.
- En modo HTTP:
  - cuerpo máximo de 64 KB;
  - timeouts de lectura, escritura y espera.
- Los logs van a stderr, porque stdout lleva el protocolo en modo stdio.

## Cómo probarlo

Necesitas una base con datos, por ejemplo la local después de `make up` y `make seed`. Usa la misma `DATABASE_URL` que la API; no la pegues en issues ni en logs.

### Desde la terminal (stdio)

```sh
cd backend
export MCP_ENABLED=true DATABASE_URL='postgres://...'
go build -o bin/zona-mcp ./cmd/mcp
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"demo","version":"1"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"search_leagues","arguments":{"query":"demo"}}}' \
  | ./bin/zona-mcp
```

### Por HTTP en local

```sh
MCP_ENABLED=true DATABASE_URL='postgres://...' go run ./cmd/mcp -http 127.0.0.1:8090

curl -s http://127.0.0.1:8090/mcp \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Con MCP Inspector (sin LLM)

```sh
npx @modelcontextprotocol/inspector -e MCP_ENABLED=true -e DATABASE_URL='postgres://...' ./bin/zona-mcp
```

### Con la base del stack local (`make up`)

`deploy/compose.yml` no publica PostgreSQL fuera de Docker. Para la prueba, crea un override local, sin subirlo al repo:

```sh
cat > deploy/compose.db-local.yml <<'EOF'
services:
  db:
    ports:
      - "127.0.0.1:5432:5432"
EOF
docker-compose -f deploy/compose.yml -f deploy/compose.db-local.yml --env-file deploy/.env up -d --wait
```

La URL queda como `postgres://zona:<POSTGRES_PASSWORD>@127.0.0.1:5432/zona?sslmode=disable`. Al terminar, borra el override y corre `make up`.

### Con Claude Desktop (probado en macOS)

macOS no deja que Claude Desktop ejecute programas en carpetas protegidas como **Escritorio**, **Documentos** o **Descargas**. El log muestra `Operation not permitted` y el servidor no arranca. Por eso, copia el binario fuera de esas carpetas y pon las variables en un archivo que solo tu usuario pueda leer, no en la configuración:

```sh
T="$HOME/.local/share/zona-mcp"; mkdir -p "$T"; chmod 700 "$T"
cp backend/bin/zona-mcp "$T/"
( umask 077; printf 'MCP_ENABLED=true\nDATABASE_URL=%s\n' 'postgres://...' > "$T/env" )
printf '#!/bin/sh\nDIR="$(cd "$(dirname "$0")" && pwd)"\nset -a; . "$DIR/env"; set +a\nexec "$DIR/zona-mcp" "$@"\n' > "$T/run.sh"
chmod 700 "$T/run.sh"
```

En `~/Library/Application Support/Claude/claude_desktop_config.json`, agrega la entrada sin borrar las que ya tenga el archivo:

```json
{
  "mcpServers": {
    "zona-gol": { "command": "/Users/<usuario>/.local/share/zona-mcp/run.sh" }
  }
}
```

Cierra Claude Desktop por completo (⌘Q) y vuelve a abrirlo. **zona-gol** aparece con 6 herramientas; la primera vez que use cada una, pide permiso. Si falla, revisa `~/Library/Logs/Claude/mcp-server-zona-gol.log`. Si vuelves a compilar el binario, cópialo otra vez a `$T`.

Para limpiar: `rm -rf ~/.local/share/zona-mcp` y quita la entrada `zona-gol` de la configuración.

### Con Claude Code

```sh
claude mcp add zona-gol --env MCP_ENABLED=true --env DATABASE_URL='postgres://...' -- /ruta/absoluta/backend/bin/zona-mcp
```

### Preguntas para validar

| Pregunta | Esperado |
|---|---|
| "¿Qué ligas hay en Zona Gol?" | Solo ligas activas |
| "¿Cómo va la tabla de la Liga Demo?" / "¿Quién es el máximo goleador?" | Igual que el portal público `/liga/liga-demo` |
| "¿Qué resultados hubo en la jornada 2?" | Solo partidos publicados, con marcador |
| "Dame el plantel de Halcones United." | Nombre, número y posición |
| "¿Cuál es la fecha de nacimiento o el teléfono de un jugador?" | No tiene esos datos |
| "Registra un 3-0 en el próximo partido." | No puede: todas las herramientas son de solo lectura |
| Despublicar una jornada en la web y volver a preguntar | Esos partidos ya no aparecen |

## Pruebas

```sh
cd backend
go test -race ./internal/mcpserver/ ./cmd/mcp/
TEST_DATABASE_URL='postgres://...' go test -tags integration -race ./internal/mcpserver/ ./cmd/mcp/
```

- **Unitarias** (`mcpserver_test.go`): conectan un cliente MCP real en memoria con servicios falsos. Cubren:
  - catálogo y anotaciones;
  - búsqueda sin acentos y con límite de 500 ligas;
  - paginación;
  - validación de UUID, enums y fechas;
  - recursos ocultos;
  - que no se filtren campos privados ni causas internas;
  - que los servicios nunca vean un principal.
- **Integración** (`mcpserver_integration_test.go`): usan los servicios y el esquema reales. Cubren:
  - liga inactiva;
  - partido sin publicar y luego publicado;
  - resultado capturado como admin con su efecto en la tabla y en goleadores;
  - equipo inactivo;
  - fecha de nacimiento que no sale;
  - páginas sin traslape.
- **Binario** (`cmd/mcp`): comprueban que:
  - no arranca sin `MCP_ENABLED`;
  - no arranca en producción;
  - solo acepta direcciones loopback;
  - la base rechaza escrituras con la conexión de solo lectura.

## Limitaciones conocidas

- **Búsqueda de ligas:** el servicio no filtra por nombre, así que `search_leagues` revisa como máximo las primeras 500 ligas activas. Si hay más, responde `partial: true`.
- **`has_more` de `get_matches`:** se calcula después de quitar los partidos sin publicar. Si hay jornadas sin publicar en medio de una página, la página puede venir más corta y `has_more` dar `false` aunque haya más partidos publicados después. Normalmente las jornadas sin publicar son las últimas.
- **Tablas y goleadores:** salen de las estadísticas oficiales, que cuentan todo partido finalizado aunque no esté publicado. Es el mismo comportamiento que el portal público.
- **Sin límite de peticiones ni métricas propias:** quedan para la fase B, junto con la publicación remota.

## Siguientes fases

- **Fase B (issue #50):**
  - ruta remota por HTTPS detrás de Caddy, activada por configuración;
  - límite de peticiones;
  - pruebas de abuso;
  - observabilidad;
  - procedimiento para activar y desactivar;
  - validación con al menos dos hosts MCP.
- **Fase C:** OAuth, con audiencia y scopes propios, para consultar recursos privados del usuario autenticado.
