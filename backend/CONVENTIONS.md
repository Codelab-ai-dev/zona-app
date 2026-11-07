# Backend conventions (Zona Gol API)

Every contributor — human or agent — follows these rules. Code review rejects
changes that break them.

## Layout

```
cmd/api/            entrypoint: config, wiring, graceful shutdown
internal/config     env-based config (only place that reads os.Getenv)
internal/platform/  cross-cutting infra: database, httpx
internal/auth       token verification, Principal, RequireAuth/RequireRole
internal/authz      resource-level authorization (replaces Supabase RLS)
internal/<module>/  one package per feature (see internal/users as reference)
migrations/         goose SQL migrations, embedded in the binary
```

A feature package contains:

| File | Responsibility |
|---|---|
| `<module>.go` | domain types (JSON DTOs) and the `Repository` interface |
| `repository.go` | `PGRepository` — SQL only, no business rules |
| `service.go` | business rules **and authorization**; depends on interfaces |
| `handler.go` | HTTP ↔ service translation; `Routes(r chi.Router)` |
| `*_test.go` | table-driven tests with fakes for every interface |

Packages must not import each other's internals. Share through small
interfaces declared by the consumer. Never edit `cmd/api/main.go` or
`internal/server/` from a feature task; the maintainer wires modules.

## Security rules (non-negotiable)

1. **Every mutating endpoint is authenticated and authorized.** Use
   `auth.RequireAuth` / `auth.RequireRole` on the route **and** an
   `authz.Checker` call in the service for resource ownership. Never trust IDs
   from the body to establish identity — the caller is `auth.FromContext`.
2. **SQL is always parameterized** (`$1`, `$2`…). No `fmt.Sprintf` / string
   concatenation in queries. Dynamic `ORDER BY`/columns must come from a
   whitelist map.
3. **Validate all input**: DTOs implement `Validate() map[string]string`; use
   `httpx.DecodeJSON` (size limit + unknown fields rejected) and
   `httpx.UUIDParam` for path IDs. Bound every list with a `limit` (max 100).
4. **Never leak internals**: return `httpx.Err*` / `httpx.Validation`; wrap
   causes with `.Wrap(err)` for logs. No stack traces, SQL errors or secrets in
   responses.
5. **Secrets come from `config.Config`**, never hardcoded, never logged. No
   fallback default values for keys, URLs or phone IDs.
6. **Webhooks verify signatures** (HMAC, constant-time compare via
   `hmac.Equal`) before parsing the body, and reject stale timestamps.
7. **External calls** (Mux, Kapso/WhatsApp, Groq, S3) use an `http.Client`
   with a timeout and `context`, behind an interface so tests use fakes.
8. **Files**: validate content type by sniffing (`http.DetectContentType`),
   enforce size limits, generate object keys server-side (`uuid`), never use
   user-provided paths (no `..`).
9. **Logs**: `log/slog` with structured fields. Do not log tokens, passwords,
   phone numbers in full, or request bodies.

## Code style

- `gofmt`/`go vet` clean. Small functions, early returns, no globals.
- Constructors `NewX(deps...)`; dependencies injected, not created inside.
- Errors wrapped with context: `fmt.Errorf("create team: %w", err)`.
- `context.Context` is the first parameter of anything that does I/O.
- JSON fields in `snake_case` to stay compatible with the current clients.
- Comments explain *why*; exported identifiers get a doc comment.
- Messages shown to end users are in Spanish; code and logs in English.

## Database

- Schema changes = new goose migration `migrations/000NN_<desc>.sql` with
  `-- +goose Up` / `-- +goose Down`. Never edit an applied migration.
- Use `database.WithUserTx` when a write fires legacy triggers that call
  `auth.uid()`; use `database.WithTx` for multi-statement writes.
- Repositories accept `database.Querier` so they work inside transactions.

## Tests

- `go test ./...` must pass; `go vet ./...` clean.
- Each endpoint has tests for: unauthenticated (401), wrong role/owner (403),
  invalid input (422), not found (404) and the happy path.
- Services are tested with fake repositories / fake `authz.Checker`.
- DB integration tests use the build tag `integration` and `TEST_DATABASE_URL`.

## Lessons from phase 1 (mandatory checklist before reporting "done")

Every item below was a real defect found in review. Check each one.

- [ ] **Integration tests against the real schema** (`//go:build integration`,
      `testdb.Pool` + `testdb.Seed`) call *every* repository method. Unit tests
      with fakes do not catch wrong column names, types or CHECK constraints.
      Run: `TEST_DATABASE_URL=... go test -tags integration ./internal/<pkg>/...`
- [ ] Enum values in DTO `Validate()` match the DB `CHECK` constraints exactly
      (grep the table in `migrations/00001_baseline.sql`).
- [ ] Nullable columns are scanned into pointers or `COALESCE`d; `time`/`date`
      columns are formatted in SQL (`to_char`) or scanned into `time.Time`.
- [ ] No identifier from the client reaches SQL: `ORDER BY`/column names come
      from a whitelist map.
- [ ] Ownership is derived from the database (load the row, then authorize
      with `authz.Checker`), never from IDs in the request body. When a request
      references several resources (league + tournament + match), verify they
      belong together.
- [ ] Updates use typed DTOs with pointer fields; status, counters, owner ids
      and provider ids are never client-writable. No `map[string]any` updates.
- [ ] No stubs, TODOs or "not yet implemented" paths. If something cannot be
      done, say so explicitly in the report instead of marking it resolved.
- [ ] Errors from repositories are returned, never discarded with `_ =`.
- [ ] `go test -race` passes (fakes used by concurrent code need a mutex).
- [ ] Test doubles live in `_test.go` files only.

## Route parameter names

chi panics when two routes use different parameter names in the same
position, so every module uses these exact names: `{leagueID}`,
`{tournamentID}`, `{teamID}`, `{playerID}`, `{matchID}`, `{userID}`, and
`{<resource>ID}` for anything else (e.g. `{suspensionID}`). Never `{id}`.
