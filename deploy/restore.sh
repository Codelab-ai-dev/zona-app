#!/usr/bin/env bash
# Restores a backup made by deploy/backup.sh, REPLACING the current database
# and uploaded files.  Usage: deploy/restore.sh backups/<timestamp>
set -euo pipefail
cd "$(dirname "$0")/.."

src=${1:?usage: deploy/restore.sh backups/<timestamp>}
COMPOSE=${COMPOSE:-docker compose -f deploy/compose.yml --env-file deploy/.env}
PROJECT=zona

[[ -f $src/db.dump && -f $src/SHA256SUMS ]] || { echo "$src is not a backup" >&2; exit 1; }
(cd "$src" && shasum -a 256 -c SHA256SUMS >/dev/null) || { echo "checksum mismatch: backup is corrupt" >&2; exit 1; }

read -r -p "This REPLACES the current data with $src. Type 'restaurar' to continue: " answer
[[ $answer == restaurar ]] || { echo "Cancelled."; exit 1; }

echo "→ Stopping the API"
$COMPOSE stop api web

echo "→ Database"
$COMPOSE exec -T db dropdb -U zona --if-exists --force zona
$COMPOSE exec -T db createdb -U zona zona
$COMPOSE exec -T db pg_restore -U zona -d zona --no-owner --exit-on-error < "$src/db.dump"

for vol in media_public media_private; do
	echo "→ $vol"
	docker run --rm -v "${PROJECT}_${vol}:/v" -v "$PWD/$src:/b:ro" alpine \
		sh -c "find /v -mindepth 1 -delete && tar xzf /b/$vol.tar.gz -C /v && chown -R 65532:65532 /v"
done

echo "→ Starting"
$COMPOSE up -d --wait
echo "Restored from $src"
