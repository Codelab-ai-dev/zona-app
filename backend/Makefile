.PHONY: run test vet lint check db-up db-down

DB_CONTAINER ?= zona-pg-dev

run:
	go run ./cmd/api

test:
	go test -race ./...

vet:
	go vet ./...

check: vet test

db-up:
	docker run -d --name $(DB_CONTAINER) -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zona -p 55432:5432 pgvector/pgvector:pg16

db-down:
	docker rm -f $(DB_CONTAINER)
