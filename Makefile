# Local stack (Postgres + Go API + web behind Caddy) at http://localhost:8088
COMPOSE_BIN := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo docker-compose)
COMPOSE := $(COMPOSE_BIN) -f deploy/compose.yml -f deploy/compose.local.yml --env-file deploy/.env

.PHONY: env web up seed down logs ps reset

# Creates deploy/.env with random secrets (only if it doesn't exist yet).
env:
	@test -f deploy/.env || { \
		sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$$(openssl rand -hex 24)|" \
		    -e "s|^JWT_SECRET=.*|JWT_SECRET=$$(openssl rand -hex 32)|" \
		    -e "s|^SEED_PASSWORD=.*|SEED_PASSWORD=demo-$$(openssl rand -hex 6)|" \
		    deploy/.env.example > deploy/.env && chmod 600 deploy/.env && \
		echo "deploy/.env created"; }

# Builds the SPA on the host (served by Caddy from web/dist).
web:
	cd web && npm ci --ignore-scripts && npx vite build

up: env web
	$(COMPOSE) up -d --build --wait
	@$(MAKE) --no-print-directory seed
	@echo "Zona Gol running at http://localhost:8088"

# Loads demo accounts and data (idempotent; refuses to run in production).
seed:
	$(COMPOSE) run --rm --no-deps --entrypoint /seed \
		-e SEED_PASSWORD="$$(grep '^SEED_PASSWORD=' deploy/.env | cut -d= -f2-)" api
	@echo "Demo accounts: superadmin@zonagol.local, liga@zonagol.local, equipo@zonagol.local"
	@echo "Password: SEED_PASSWORD in deploy/.env"

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f api web

ps:
	$(COMPOSE) ps

# Deletes the local database volume too.
reset:
	$(COMPOSE) down -v
