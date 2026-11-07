# API routes

Generated from the router by `cmd/api/manifest_test.go`; do not edit by hand.
Regenerate: `UPDATE_ROUTES=1 go test ./cmd/api -run TestRouteManifest`.

Response contract, pagination and errors: see `CONVENTIONS.md` → API contract.
`token` = requires `Authorization: Bearer <jwt>`; resource ownership is checked by each service.

## admin

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/admin/users` | token |
| PATCH | `/api/v1/admin/users/{userID}` | token |

## agent

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/agent/messages` | token |
| POST | `/api/v1/agent/webhooks/kapso` | público |

## coaching-staff

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/coaching-staff/{staffID}` | público |
| PATCH | `/api/v1/coaching-staff/{staffID}` | token |
| POST | `/api/v1/coaching-staff/{staffID}/deactivate` | token |

## healthz

| Method | Path | Access |
|---|---|---|
| GET | `/healthz` | público |

## knowledge

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/knowledge/embeddings` | token |
| POST | `/api/v1/knowledge/triggers` | token |

## leagues

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/leagues` | público |
| POST | `/api/v1/leagues` | token |
| GET | `/api/v1/leagues/admin` | token |
| GET | `/api/v1/leagues/mine` | token |
| GET | `/api/v1/leagues/slug/{slug}` | público |
| GET | `/api/v1/leagues/{leagueID}` | público |
| PATCH | `/api/v1/leagues/{leagueID}` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/balances` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/config` | token |
| PUT | `/api/v1/leagues/{leagueID}/finance/config` | token |
| POST | `/api/v1/leagues/{leagueID}/finance/matches/{matchID}/generate-fines` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/summary` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/teams/{teamID}/balance` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/teams/{teamID}/transactions` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/transactions` | token |
| POST | `/api/v1/leagues/{leagueID}/finance/transactions` | token |
| GET | `/api/v1/leagues/{leagueID}/finance/transactions/{transactionID}` | token |
| PUT | `/api/v1/leagues/{leagueID}/finance/transactions/{transactionID}` | token |
| POST | `/api/v1/leagues/{leagueID}/finance/transactions/{transactionID}/cancel` | token |
| POST | `/api/v1/leagues/{leagueID}/finance/transactions/{transactionID}/pay` | token |
| POST | `/api/v1/leagues/{leagueID}/finance/transactions/{transactionID}/waive` | token |
| GET | `/api/v1/leagues/{leagueID}/matches/pending` | público |
| POST | `/api/v1/leagues/{leagueID}/players/qr-batch` | token |
| PATCH | `/api/v1/leagues/{leagueID}/product-mode` | token |
| PATCH | `/api/v1/leagues/{leagueID}/status` | token |
| GET | `/api/v1/leagues/{leagueID}/suspensions` | token |
| GET | `/api/v1/leagues/{leagueID}/tournaments` | público |
| GET | `/api/v1/leagues/{leagueID}/users` | token |
| GET | `/api/v1/leagues/{leagueID}/whatsapp-links` | token |
| POST | `/api/v1/leagues/{leagueID}/whatsapp-links` | token |

## matches

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/matches` | token |
| DELETE | `/api/v1/matches/{matchID}` | token |
| GET | `/api/v1/matches/{matchID}` | público |
| GET | `/api/v1/matches/{matchID}/attendance` | token |
| POST | `/api/v1/matches/{matchID}/attendance/facial` | token |
| POST | `/api/v1/matches/{matchID}/attendance/qr` | token |
| GET | `/api/v1/matches/{matchID}/attendance/stream` | token |
| PATCH | `/api/v1/matches/{matchID}/publish` | token |
| GET | `/api/v1/matches/{matchID}/referee-report` | token |
| POST | `/api/v1/matches/{matchID}/referee-report` | token |
| POST | `/api/v1/matches/{matchID}/result` | token |
| PATCH | `/api/v1/matches/{matchID}/schedule` | token |

## me

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/me` | token |

## my-teams

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/my-teams` | token |

## notifications

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/notifications/leagues/{leagueID}` | token |
| POST | `/api/v1/notifications/matches/{matchID}/finalized` | token |
| POST | `/api/v1/notifications/test` | token |

## play

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/play/clips` | público |
| POST | `/api/v1/play/clips` | token |
| DELETE | `/api/v1/play/clips/{clipId}` | token |
| GET | `/api/v1/play/clips/{clipId}` | público |
| GET | `/api/v1/play/streams` | público |
| POST | `/api/v1/play/streams` | token |
| DELETE | `/api/v1/play/streams/{streamId}` | token |
| GET | `/api/v1/play/streams/{streamId}` | público |
| PATCH | `/api/v1/play/streams/{streamId}` | token |
| POST | `/api/v1/play/upload` | token |
| GET | `/api/v1/play/videos` | público |
| POST | `/api/v1/play/videos` | token |
| DELETE | `/api/v1/play/videos/{videoId}` | token |
| GET | `/api/v1/play/videos/{videoId}` | público |
| PATCH | `/api/v1/play/videos/{videoId}` | token |
| POST | `/api/v1/play/videos/{videoId}/refresh` | token |
| POST | `/api/v1/play/webhooks/mux` | público |

## player-registration-requests

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/player-registration-requests/{reqID}` | token |
| PATCH | `/api/v1/player-registration-requests/{reqID}/review` | token |

## players

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/players/{playerID}` | público |
| PATCH | `/api/v1/players/{playerID}` | token |
| POST | `/api/v1/players/{playerID}/deactivate` | token |
| GET | `/api/v1/players/{playerID}/stats` | público |

## standings

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/standings/adjust` | token |

## storage

| Method | Path | Access |
|---|---|---|
| DELETE | `/api/v1/storage/objects` | token |
| GET | `/api/v1/storage/objects` | token |
| POST | `/api/v1/storage/objects` | token |
| GET | `/api/v1/storage/url` | token |

## suspensions

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/suspensions` | token |
| PUT | `/api/v1/suspensions/{suspensionID}` | token |
| POST | `/api/v1/suspensions/{suspensionID}/apply-to-match` | token |
| POST | `/api/v1/suspensions/{suspensionID}/cancel` | token |
| POST | `/api/v1/suspensions/{suspensionID}/complete` | token |

## teams

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/teams` | público |
| POST | `/api/v1/teams` | token |
| GET | `/api/v1/teams/{teamID}` | público |
| PATCH | `/api/v1/teams/{teamID}` | token |
| POST | `/api/v1/teams/{teamID}/activate` | token |
| GET | `/api/v1/teams/{teamID}/coaching-staff` | público |
| POST | `/api/v1/teams/{teamID}/coaching-staff` | token |
| POST | `/api/v1/teams/{teamID}/deactivate` | token |
| GET | `/api/v1/teams/{teamID}/matches` | público |
| GET | `/api/v1/teams/{teamID}/player-registration-requests` | token |
| GET | `/api/v1/teams/{teamID}/players` | público |
| POST | `/api/v1/teams/{teamID}/players` | token |
| GET | `/api/v1/teams/{teamID}/stats` | público |
| GET | `/api/v1/teams/{teamID}/suspensions` | token |
| POST | `/api/v1/teams/{teamID}/tournaments/{tournamentID}/player-registration-requests` | token |

## tournaments

| Method | Path | Access |
|---|---|---|
| POST | `/api/v1/tournaments` | token |
| GET | `/api/v1/tournaments/{tournamentID}` | público |
| PATCH | `/api/v1/tournaments/{tournamentID}` | token |
| GET | `/api/v1/tournaments/{tournamentID}/discipline` | público |
| GET | `/api/v1/tournaments/{tournamentID}/duplicates` | token |
| POST | `/api/v1/tournaments/{tournamentID}/fixtures/generate` | token |
| GET | `/api/v1/tournaments/{tournamentID}/matches` | público |
| POST | `/api/v1/tournaments/{tournamentID}/matches/bulk` | token |
| GET | `/api/v1/tournaments/{tournamentID}/matches/upcoming` | público |
| GET | `/api/v1/tournaments/{tournamentID}/player-registration-requests` | token |
| POST | `/api/v1/tournaments/{tournamentID}/playoffs/generate` | token |
| POST | `/api/v1/tournaments/{tournamentID}/rounds/{round}/publish` | token |
| GET | `/api/v1/tournaments/{tournamentID}/standings` | público |
| GET | `/api/v1/tournaments/{tournamentID}/top-scorers` | público |

## users

| Method | Path | Access |
|---|---|---|
| GET | `/api/v1/users` | token |

## whatsapp-links

| Method | Path | Access |
|---|---|---|
| DELETE | `/api/v1/whatsapp-links/{linkID}` | token |
| PUT | `/api/v1/whatsapp-links/{linkID}` | token |

Total: 122 routes.
