#!/usr/bin/env bash
# Backs up the database and uploaded files into backups/<timestamp>/:
#   db.dump               pg_dump custom format (restore with deploy/restore.sh)
#   media_public.tar.gz   logos and photos
#   media_private.tar.gz  identity documents (sensitive)
#   SHA256SUMS            integrity check
# Backups contain personal data: they are created with 700/600 permissions
# and backups/ is git-ignored. Keep a copy off this machine.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE=${COMPOSE:-docker compose -f deploy/compose.yml --env-file deploy/.env}
PROJECT=zona
dest="backups/$(date +%Y%m%d-%H%M%S)"
umask 077
mkdir -p "$dest"

echo "→ Database"
$COMPOSE exec -T db pg_dump -U zona -d zona --format=custom --no-owner > "$dest/db.dump"
[[ -s $dest/db.dump ]] || { echo "empty database dump" >&2; exit 1; }

for vol in media_public media_private; do
	echo "→ $vol"
	docker run --rm -v "${PROJECT}_${vol}:/v:ro" -v "$PWD/$dest:/b" alpine \
		tar czf "/b/$vol.tar.gz" -C /v .
done

(cd "$dest" && shasum -a 256 db.dump media_public.tar.gz media_private.tar.gz > SHA256SUMS)
chmod 600 "$dest"/*
echo "Backup ready: $dest ($(du -sh "$dest" | cut -f1))"
