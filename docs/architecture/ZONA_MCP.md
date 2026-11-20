# Zona OS MCP Server — Fases A y B

Servidor [Model Context Protocol](https://modelcontextprotocol.io) para que clientes de IA (Claude, ChatGPT u otros hosts MCP) consulten **datos deportivos públicos de Zona Gol**. Issue #50.

**No forma parte del lanzamiento de enero de 2027** y no cambia la API REST, la web ni la app. La fase A es la prueba de concepto local; la fase B agrega el endpoint remoto por HTTPS, **apagado por defecto** y detrás de dos interruptores (ver [Fase B](#fase-b-endpoint-remoto-por-https)).

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
| Transportes | **stdio** (por omisión) y **Streamable HTTP** sin sesión (`POST /mcp`, respuestas JSON). En loopback desde la fase A; detrás de Caddy desde la fase B. |

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
- No arranca con `APP_ENV=production` salvo con `MCP_PUBLIC=true`, y en producción solo por HTTP.
- Con `-http` o `MCP_HTTP_ADDR`, solo escucha en `127.0.0.1`, `::1` o `localhost`, salvo con `MCP_PUBLIC=true` (fase B).
- La conexión a PostgreSQL se abre con `default_transaction_read_only=on`: aunque una herramienta tuviera un error, la base rechaza cualquier escritura. También con `statement_timeout` (5 s por omisión).
- Cada llamada a una herramienta tiene un límite de tiempo (10 s por omisión), también por stdio.
- En modo HTTP aplica todas las protecciones de la [fase B](#protecciones-del-endpoint-http).
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
- **Límite de peticiones en memoria:** vale para una sola instancia detrás de Caddy. Con varias instancias haría falta un almacén compartido.
- **Métricas:** no hay endpoint de métricas; la observabilidad sale de los logs JSON (ver [Monitoreo](#monitoreo)).
- **Puerto local `127.0.0.1:8090`:** el servicio confía en `X-Forwarded-For` de redes privadas para identificar al cliente detrás de Caddy. Desde la propia máquina se podría falsificar esa cabecera para evadir el límite; por eso ese puerto nunca debe publicarse fuera de loopback.

## Fase B: endpoint remoto por HTTPS

La fase B publica el mismo servidor, con el mismo catálogo de 6 herramientas de solo lectura, como servicio aparte detrás de Caddy. **No cambia ninguna herramienta ni regla de visibilidad.**

```text
Host MCP (Claude, ChatGPT, Inspector…)
      | HTTPS  POST https://<dominio>/mcp
Caddy (web)   — 404 salvo MCP_PUBLIC=true; cuerpo ≤ 64 KB; reemplaza X-Forwarded-For
      | http://mcp:8090/mcp  (red interna de Docker)
Servicio mcp  — /mcp: Origin, límite por cliente, concurrencia, timeouts, logs
      | conexión de solo lectura (statement_timeout)
PostgreSQL
```

### Dos interruptores, apagado por defecto

1. **El servicio `mcp`** está en el *profile* `mcp` de `deploy/compose.yml`: `make up` no lo arranca.
2. **`MCP_PUBLIC=true`** en `deploy/.env`. Sin él, el binario se niega a escuchar fuera de loopback y Caddy responde **404** en `/mcp` (y en `/mcp/healthz`).

Con los dos activos, el servidor responde en `https://<dominio>/mcp`. Con solo uno, no hay endpoint remoto.

### Configuración

Todas las variables se leen en `internal/config` (`config.LoadMCP`).

| Variable | Por omisión | Para qué |
|---|---|---|
| `MCP_ENABLED` | — | Debe ser exactamente `true` o el binario no arranca. El servicio `mcp` ya la trae. |
| `MCP_PUBLIC` | `false` | Permite escuchar fuera de loopback y correr en producción. Caddy solo enruta `/mcp` con `true`. |
| `MCP_HTTP_ADDR` | vacío (stdio) | `:8090` en el servicio `mcp`. |
| `MCP_TRUSTED_PROXIES` | redes privadas en compose | Redes cuyo `X-Forwarded-For` se cree (Caddy). Obligatoria con `MCP_PUBLIC`. |
| `MCP_ALLOWED_ORIGINS` | vacío | Orígenes de navegador aceptados (`https://…`). Los hosts MCP que no son navegador no mandan `Origin` y no se ven afectados. |
| `MCP_RATE_LIMIT_RPS` / `MCP_RATE_LIMIT_BURST` | `2` / `20` | Presupuesto por cliente (token bucket). |
| `MCP_MAX_CONCURRENT` | `16` | Llamadas simultáneas. |
| `MCP_QUEUE_WAIT` | `2s` | Espera por un cupo antes de responder 503. |
| `MCP_CALL_TIMEOUT` | `10s` | Límite de cada llamada a herramienta. |
| `MCP_DB_STATEMENT_TIMEOUT` | `5s` | `statement_timeout` de PostgreSQL; debe ser menor que `MCP_CALL_TIMEOUT`. |

### Protecciones del endpoint HTTP

Cada petición a `/mcp` pasa, en orden, por:

| Control | Respuesta | Por qué |
|---|---|---|
| Solo `POST` | **405** | El servidor no tiene sesiones: no hay `GET` (SSE) ni `DELETE`. |
| `Origin` presente y fuera de `MCP_ALLOWED_ORIGINS` | **403** | Una página web ajena no puede manejar el servidor (CORS, DNS rebinding). |
| Límite por cliente | **429** + `Retry-After` | Frena la enumeración de IDs. El cliente es la IP real: el `X-Forwarded-For` más a la derecha que no sea un proxy de confianza. Caddy reemplaza el que mande el cliente, así que no se puede falsificar. |
| Concurrencia | espera hasta `MCP_QUEUE_WAIT`, luego **503** | Una ráfaga de consultas lentas no agota el pool de la base. |
| Cuerpo > 64 KB | **413** | Caddy corta antes; el servidor también. |
| Tiempo | error legible para el cliente | La llamada se detiene al vencer `MCP_CALL_TIMEOUT` o si el cliente se desconecta. |

Además: `statement_timeout` y transacciones de solo lectura en PostgreSQL, cabeceras de 16 KB como máximo y timeouts de lectura y escritura en el servidor HTTP. Las respuestas llevan `X-Request-Id`.

El SDK ejecuta las herramientas con el contexto de la sesión, no con el de la petición: recibe sus valores, pero no su cancelación. La capa HTTP pasa la señal de fin de la petición en el contexto y el middleware `observe` cancela la herramienta. Hay una prueba que lo verifica.

### Monitoreo

Los logs son JSON por stderr (`make mcp-logs`). No registran argumentos, cuerpos, cabeceras ni la IP: el cliente aparece como un hash con sal por proceso, suficiente para agrupar las peticiones de un mismo cliente.

| Mensaje | Campos | Sirve para |
|---|---|---|
| `mcp http` | `request_id`, `method`, `status`, `rejected` (`method`, `origin`, `rate_limit`, `busy`, `body_size` o vacío), `client`, `duration_ms` | Tráfico, rechazos y latencia por petición |
| `mcp tool call` | `tool`, `outcome` (`ok`, `tool_error`, `protocol_error`), `duration_ms`, `request_id` | Uso y errores por herramienta |
| `mcp tool failed` | `tool`, `err` | Causa interna de un "Error interno" (el cliente no la ve) |

Señales para revisar: muchos `rate_limit` de un mismo `client` (enumeración), `busy` frecuentes (subir `MCP_MAX_CONCURRENT` o revisar la base) y `mcp tool failed`. `GET /mcp/healthz` responde `ok` para un monitor externo.

### Activar

1. Revisar y aprobar el [checklist de seguridad](#checklist-de-seguridad-fase-b).
2. En `deploy/.env`: `MCP_PUBLIC=true` (y `MCP_ALLOWED_ORIGINS` solo si un cliente de navegador lo necesita).
3. `make mcp-up`: compila, arranca `mcp` y recrea `web` para que Caddy tome `MCP_PUBLIC`.
4. Comprobar `https://<dominio>/mcp/healthz` y una llamada de prueba con MCP Inspector.

### Desactivar y rollback

- **Cortar el acceso de inmediato:** `MCP_PUBLIC=false` en `deploy/.env` y `make up`. Caddy vuelve a responder 404 en `/mcp`, y el servicio `mcp` deja de arrancar si se reinicia.
- **Detener el servicio:** `make mcp-down`. Sin el paso anterior, `/mcp` respondería 502.
- **Rollback de código:** el servicio no tiene migraciones ni escribe en la base. Basta volver a la imagen anterior y `make up`; la API, la web y la app no dependen de él.

### Conectar clientes

| Cliente | Cómo |
|---|---|
| MCP Inspector | `npx @modelcontextprotocol/inspector --cli https://<dominio>/mcp --transport http --method tools/list` |
| Claude Code | `claude mcp add --transport http zona-gol https://<dominio>/mcp` |
| Claude (web, Desktop, móvil) | Conector personalizado con la URL `https://<dominio>/mcp`, sin autenticación. Requiere una URL HTTPS pública. |
| Otros hosts | Cualquiera con soporte de Streamable HTTP. No todos los modelos ni apps tienen soporte MCP nativo. |

En local, con `MCP_PUBLIC=true` y `make mcp-up`, la URL es `http://localhost:8088/mcp` (a través de Caddy) o `http://127.0.0.1:8090/mcp` (directo).

### Pruebas de la fase B

```sh
cd backend
go test -race ./internal/mcpserver/ ./internal/config/ ./cmd/mcp/
TEST_DATABASE_URL='postgres://...' go test -tags integration -race -p 1 ./internal/mcpserver/ ./cmd/mcp/
```

- **Unitarias** (`http_test.go`, `internal/config/mcp_test.go`):
  - método, `Origin` (incluido un origen de DNS rebinding), límite por cliente e IP falsificada en `X-Forwarded-For`;
  - concurrencia con cola y 503, cuerpo grande (con y sin `Content-Length`) y JSON malformado;
  - timeout y cancelación por desconexión;
  - catálogo fijo (una herramienta inventada falla);
  - que los logs no contengan argumentos ni la IP;
  - configuración insegura que no arranca.
- **Integración** (`http_integration_test.go`), por HTTP con servicios y esquema reales:
  - un cliente MCP real del SDK descubre y llama herramientas;
  - liga inactiva y todo lo que cuelga de ella, IDs inventados y de otro tipo con el mismo mensaje;
  - partido sin publicar y campos privados;
  - argumentos maliciosos;
  - enumeración frenada;
  - carga ligera de 400 llamadas de 40 clientes.
- **Binario:** la conexión de solo lectura rechaza escrituras y corta consultas lentas con `statement_timeout`.

### Checklist de seguridad (fase B)

- [ ] El catálogo sigue siendo las 6 herramientas de solo lectura; ninguna recibe SQL, rutas ni identidades.
- [ ] Las reglas de visibilidad son las del portal público (heredadas de la fase A, con pruebas de integración).
- [ ] `MCP_PUBLIC` está en `false` en todo entorno donde no se haya aprobado.
- [ ] El puerto `8090` no se publica fuera de loopback (`MCP_BIND`).
- [ ] Los límites (`MCP_RATE_LIMIT_*`, `MCP_MAX_CONCURRENT`) están revisados para el tráfico esperado.
- [ ] Alguien revisa los logs `mcp http` y `mcp tool failed` la primera semana.
- [ ] Probado con al menos dos hosts MCP contra el entorno real antes de anunciarlo.

## Siguientes fases

- **Fase C:** OAuth, con audiencia y scopes propios, para consultar recursos privados del usuario autenticado. Las herramientas de escritura siguen fuera de alcance.
