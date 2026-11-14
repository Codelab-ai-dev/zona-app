//go:build integration

package main

import (
	"context"
	"os"
	"testing"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// The MCP pool must not be able to write, whatever a tool does.
func TestReadOnlyPoolRejectsWrites(t *testing.T) {
	testdb.Pool(t) // skips without TEST_DATABASE_URL, applies migrations
	dbURL, err := readOnlyURL(os.Getenv("TEST_DATABASE_URL"))
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	pool, err := database.Connect(ctx, dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer pool.Close()

	var n int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM public.leagues`).Scan(&n); err != nil {
		t.Fatalf("reads must work: %v", err)
	}
	if _, err := pool.Exec(ctx, `UPDATE public.leagues SET name = name`); err == nil {
		t.Fatal("write succeeded on the read-only pool")
	}
}
