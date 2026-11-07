.PHONY: run build test vet lint check routes db-up db-down

DB_CONTAINER ?= zona-pg-dev

run:
	go run ./cmd/api

# Output goes to bin/ (gitignored); never build into the module root.
build:
	go build -trimpath -o bin/api ./cmd/api

# Regenerate api/ROUTES.md from the router.
routes:
	UPDATE_ROUTES=1 go test ./cmd/api -run TestRouteManifest

test:
	go test -race ./...

vet:
	go vet ./...

check: vet test

db-up:
	docker run -d --name $(DB_CONTAINER) -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zona -p 55432:5432 pgvector/pgvector:pg16

db-down:
	docker rm -f $(DB_CONTAINER)
