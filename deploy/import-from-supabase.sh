#!/usr/bin/env bash
# Copies production data from Supabase into the stack's Postgres (cutover).
#
#   SOURCE_DATABASE_URL='postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres' \
#     ./deploy/import-from-supabase.sh
#
# What it does:
#   1. Dumps auth.users (id, email, bcrypt hash, timestamps, metadata) and all
#      data of the public schema from Supabase. Read-only on the source.
#   2. Loads them into the target in ONE transaction with triggers disabled
#      (session_replication_role=replica), so profile/standings/knowledge
#      triggers don't fire twice. Any error rolls everything back.
#   3. Users keep their passwords: GoTrue stores bcrypt, which the API verifies.
#
# Requirements: the target must be EMPTY and already migrated (the API runs
# migrations on start). If production's schema differs from backend/migrations,
# the load fails with a clear column/table error: compare the schemas first
# (pg_dump --schema-only of production vs. the migrated target).
# Secrets are passed via environment only; nothing is written to the repo.
set -euo pipefail

: "${SOURCE_DATABASE_URL:?set SOURCE_DATABASE_URL (Supabase direct connection, port 5432)}"
cd "$(dirname "$0")"
ENV_FILE=.env
[[ -f $ENV_FILE ]] || { echo "deploy/.env not found (run: make env)" >&2; exit 1; }
POSTGRES_PASSWORD=$(grep '^POSTGRES_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)
TARGET_DATABASE_URL="postgres://zona:${POSTGRES_PASSWORD}@db:5432/zona?sslmode=disable"
NETWORK=zona_internal
PG_IMAGE=postgres:16-alpine

workdir=$(mktemp -d)
chmod 700 "$workdir"
trap 'rm -rf "$workdir"' EXIT

pg() { docker run --rm -i --network "$NETWORK" -v "$workdir:/work" -e PGCONNECT_TIMEOUT=15 "$PG_IMAGE" "$@"; }
pg_src() { docker run --rm -i -v "$workdir:/work" -e PGCONNECT_TIMEOUT=15 "$PG_IMAGE" "$@"; }

echo "→ Checking the target is migrated and empty"
users=$(pg psql "$TARGET_DATABASE_URL" -tAc "SELECT count(*) FROM auth.users")
if [[ $users != 0 ]]; then
	echo "Target already has $users users. Aborting (use 'make reset' for a clean database)." >&2
	exit 1
fi

echo "→ Dumping auth.users from Supabase"
pg_src psql "$SOURCE_DATABASE_URL" -v ON_ERROR_STOP=1 -c "\copy (
	SELECT id, email, encrypted_password, email_confirmed_at, raw_user_meta_data,
	       raw_app_meta_data, phone, created_at, updated_at, last_sign_in_at, role, aud
	FROM auth.users WHERE deleted_at IS NULL) TO '/work/auth_users.csv' WITH (FORMAT csv)"

echo "→ Dumping public schema data from Supabase"
pg_src pg_dump "$SOURCE_DATABASE_URL" --data-only --schema=public \
	--exclude-table=public.goose_db_version --no-owner --no-privileges \
	--file=/work/public.sql

echo "→ Loading into the target (single transaction, triggers disabled)"
cat > "$workdir/load.sql" <<'SQL'
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL session_replication_role = replica;
\copy auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, phone, created_at, updated_at, last_sign_in_at, role, aud) FROM '/work/auth_users.csv' WITH (FORMAT csv)
\i /work/public.sql
SET LOCAL session_replication_role = origin;
COMMIT;
SQL
pg psql "$TARGET_DATABASE_URL" -q -f /work/load.sql

echo "→ Verifying"
pg psql "$TARGET_DATABASE_URL" -tAc "
	SELECT 'users: ' || count(*) FROM auth.users
	UNION ALL SELECT 'profiles without identity: ' || count(*) FROM public.users p
	  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id)
	UNION ALL SELECT 'leagues: ' || count(*) FROM public.leagues
	UNION ALL SELECT 'matches: ' || count(*) FROM public.matches"
echo "Done. Existing sessions are not migrated: everyone signs in again with their usual password."
