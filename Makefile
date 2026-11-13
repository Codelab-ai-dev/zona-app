# Local stack (Postgres + Go API + web behind Caddy) at http://localhost:8088
COMPOSE_BIN := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo docker-compose)
COMPOSE := $(COMPOSE_BIN) -f deploy/compose.yml --env-file deploy/.env

.PHONY: env up seed admin backup restore down logs ps reset

# Creates deploy/.env with random secrets (only if it doesn't exist yet).
env:
	@test -f deploy/.env || { \
		sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(openssl rand -hex 24)|" \
		    -e "s|^JWT_SECRET=.*|JWT_SECRET=$$(openssl rand -hex 32)|" \
		    -e "s|^SEED_PASSWORD=.*|SEED_PASSWORD=demo-$$(openssl rand -hex 6)|" \
		    deploy/.env.example > deploy/.env && chmod 600 deploy/.env && \
		echo "deploy/.env created"; }

up: env
	$(COMPOSE) up -d --build --wait
	@echo "Zona Gol running at http://localhost:8088"
	@echo "Next: make admin EMAIL=you@example.com  (or make seed for demo data)"

# Loads demo accounts and data (idempotent; refuses to run in production).
seed:
	$(COMPOSE) run --rm --no-deps --entrypoint /seed \
		-e SEED_PASSWORD="$$(grep '^SEED_PASSWORD=' deploy/.env | cut -d= -f2-)" api
	@echo "Demo accounts: superadmin@zonagol.local; league A liga@ / equipo@zonagol.local; league B liga-b@ / equipo-b@zonagol.local"
	@echo "Matchday rehearsal guide: docs/operations/ENSAYO_JORNADA.md"
	@echo "Password: SEED_PASSWORD in deploy/.env"

# Creates or promotes a super admin: make admin EMAIL=ana@liga.mx NAME="Ana"
# (asks for the password without echoing it).
admin:
	@test -n "$(EMAIL)" || { echo "usage: make admin EMAIL=you@example.com NAME=\"Your name\""; exit 1; }
	@printf "Password (10-72 characters): "; stty -echo; read pw; stty echo; echo; \
	$(COMPOSE) run --rm --no-deps --entrypoint /createadmin \
		-e ADMIN_EMAIL="$(EMAIL)" -e ADMIN_NAME="$(NAME)" -e ADMIN_PASSWORD="$$pw" api

# Database + uploaded files into backups/<timestamp>/ (git-ignored).
backup:
	@COMPOSE="$(COMPOSE)" deploy/backup.sh

# Replaces current data with a backup: make restore FROM=backups/<timestamp>
restore:
	@test -n "$(FROM)" || { echo "usage: make restore FROM=backups/<timestamp>"; exit 1; }
	@COMPOSE="$(COMPOSE)" deploy/restore.sh "$(FROM)"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f api web

ps:
	$(COMPOSE) ps

# Deletes the local database volume too.
reset:
	$(COMPOSE) down -v
