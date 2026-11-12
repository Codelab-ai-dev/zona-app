# CLAUDE.md — Zona App / Zona OS

This file provides repository-specific guidance for **Claude Code**, the primary coding assistant for this project. Follow `backend/CONVENTIONS.md` for Go implementation rules. Read `docs/architecture/ZONA_OS_ARCHITECTURE.md` and `docs/roadmap/ZONA_OS_2027.md` before work related to Zona OS.

## Product scope (mandatory)

- Zona OS is a **multisport amateur competition ecosystem**, starting with operational **football leagues in January 2027**.
- Zona Gol manages leagues, tournaments, teams, players, fixtures, results, standings, discipline and sports attendance.
- Zona Play is a **deferred future application** for video recordings, clips and live streams. It will **not be offered to January 2027 leagues**. Do not implement Zona Play features or Gol↔Play integrations unless explicitly requested.
- Flutter is a mobile app using the same Go API.
- Do **not** introduce POS, inventory, generic ERP, unrelated business modules, a marketplace or microservices unless explicitly requested.
- January 2027 scope is **Zona Gol football league operations only**. Treat existing Play security findings as blockers to **future Play exposure**, not as January delivery tasks. Check public deployment exposure before leaving Play routes enabled.
- Multisport means the **core sports competition model** can eventually support other rulesets. Football stays fully operational. Volleyball is a future architecture-validation candidate, not a January feature.

## Current repository

- `backend/`: Go API (Chi, pgx, Goose, PostgreSQL).
- `web/`: React, Vite, React Router, TanStack Query, TypeScript.
- `zona_gol_mobile/`: Flutter.
- `deploy/`: Docker Compose, Caddy, PostgreSQL with pgvector.
- `.github/workflows/backend.yml`, `.github/workflows/web.yml`: currently test backend and web.

## Work protocol for each issue

1. **Inspect before editing:** read target code, related services/repos, migrations, route declarations, tests and `backend/CONVENTIONS.md`. Do not rely on file names alone.
2. **Restate scope and risk:** identify affected liga/torneo/partido IDs, authorization boundaries, API clients and compatibility.
3. **Implement smallest safe change:** preserve existing public paths, SQL migrations and January football behavior. No large unrelated refactoring.
4. **Test negative cases:** unauthenticated, unauthorized league/team, invalid related IDs and cross-league isolation. Test Play/premium and media webhooks only when a specific later Play issue is in scope.
5. **Validate:** relevant Go tests, `go test -race ./...`, Go integration tests with real PostgreSQL when SQL changes, web TypeScript/lint/Vitest/build, Flutter analyze/tests for mobile changes.
6. **Report:** changed paths, assumptions, commands run and results, skipped tests, migration/rollback notes and remaining risks. Do not claim tests passed unless they ran.
7. **PR discipline:** one issue → one focused PR where possible; include acceptance criteria and a manual validation checklist. Never merge automatically or deploy without explicit instruction.

## Security invariants

- Never serialize `mux_stream_key`, provider tokens, secrets or private file keys in public JSON.
- Never equate `premium` or `unlisted` media with unrestricted access. Distinguish metadata visibility from playback entitlement.
- Validate every `league_id`, `tournament_id`, `match_id`, `team_id`, `player_id`, `recording_id` relationship server-side.
- The authenticated principal, not user-supplied IDs, determines authorization. Treat league/team/match membership context explicitly.
- Preserve auditability and consistency of official match results; use database transactions where necessary.
- Keep existing media webhook signature validation and enforce idempotency.

## Architecture rules

- Prefer a Go modular monolith, not microservices, for the current phase.
- Zona Gol is the source of truth for official sporting data; Zona Play is the source of truth for video lifecycle. No independent authoritative scoreboard in Play.
- Keep existing `/api/v1` contracts and web routes unless the issue explicitly includes a migration plan.
- Add new Goose migrations; **never edit an applied migration**.
- Do not move all existing sports tables or Go packages in a single refactor.
- Extract sport-agnostic interfaces only where rules are understood; do not assume all sports use two teams, goals or standard standings.
- Preserve user data and backwards compatibility with Flutter and React.

## Commands (run only in suitable environments)

Backend:
```sh
cd backend
gofmt -l .
go vet ./...
go test -race ./...
TEST_DATABASE_URL='postgres://...' go test -tags integration -race ./...
```

Web:
```sh
cd web
npm ci
npx tsc -b
npx eslint .
npx vitest run
npx vite build
```

Flutter:
```sh
cd zona_gol_mobile
flutter pub get
flutter analyze
flutter test
```

Do not paste real secrets into commands, commits, issue bodies or logs.

## Work sequencing

**Before January 2027:** focus exclusively on Zona Gol football league workflows: roles and isolation, fixtures, results, standings, attendance, Flutter, CI and backup/restore drills. **Do not offer, build or integrate Zona Play**. Verify existing Play routes are not publicly exposed until its security issues are fixed. Freeze high-risk structural changes toward late December.

**After production stabilization:** formalize multisport domain and roles, add a second sport pilot and standardize domain events. Reassess Zona Play independently only when product priorities change and its security issues are resolved.

## Suggested Claude Code prompt format

```
Implement GitHub issue #<NUMBER> in Codelab-ai-dev/zona-app.
Read CLAUDE.md, backend/CONVENTIONS.md and the Zona OS architecture + roadmap.
Inspect relevant code and tests first. Keep the change minimal, backward-compatible with January football leagues and secure across league/team/match boundaries.
Provide a brief implementation plan, write regression tests, run relevant checks, and open a focused PR for review.
Do not merge or deploy. Report test results and risks.
```
