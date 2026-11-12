package main

import (
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

const manifestPath = "../../api/ROUTES.md"

// TestRouteManifest keeps api/ROUTES.md in sync with the real router.
// Regenerate with: UPDATE_ROUTES=1 go test ./cmd/api -run TestRouteManifest
func TestRouteManifest(t *testing.T) {
	routes, ok := newTestAPI(t).(chi.Routes)
	if !ok {
		t.Fatal("router does not expose chi.Routes")
	}

	type row struct{ group, method, path, access string }
	var rows []row
	err := chi.Walk(routes, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		route = strings.ReplaceAll(route, "/*/", "/")
		access := "token"
		if anonymousAllowed[method+" "+route] {
			access = "público"
		}
		group := strings.Split(strings.TrimPrefix(strings.TrimPrefix(route, "/api/v1"), "/"), "/")[0]
		rows = append(rows, row{group, method, route, access})
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	sort.Slice(rows, func(i, j int) bool {
		if rows[i].group != rows[j].group {
			return rows[i].group < rows[j].group
		}
		if rows[i].path != rows[j].path {
			return rows[i].path < rows[j].path
		}
		return rows[i].method < rows[j].method
	})

	var b strings.Builder
	b.WriteString("# API routes\n\n")
	b.WriteString("Generated from the router by `cmd/api/manifest_test.go`; do not edit by hand.\n")
	b.WriteString("Regenerate: `UPDATE_ROUTES=1 go test ./cmd/api -run TestRouteManifest`.\n\n")
	b.WriteString("Response contract, pagination and errors: see `CONVENTIONS.md` → API contract.\n")
	b.WriteString("`token` = requires `Authorization: Bearer <jwt>`; resource ownership is checked by each service.\n")
	current := ""
	for _, r := range rows {
		if r.group != current {
			current = r.group
			fmt.Fprintf(&b, "\n## %s\n\n| Method | Path | Access |\n|---|---|---|\n", current)
		}
		fmt.Fprintf(&b, "| %s | `%s` | %s |\n", r.method, r.path, r.access)
	}
	fmt.Fprintf(&b, "\nTotal: %d routes.\n", len(rows))
	got := b.String()

	if os.Getenv("UPDATE_ROUTES") == "1" {
		if err := os.MkdirAll("../../api", 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(manifestPath, []byte(got), 0o644); err != nil {
			t.Fatal(err)
		}
		return
	}
	want, err := os.ReadFile(manifestPath)
	if err != nil || string(want) != got {
		t.Fatalf("api/ROUTES.md is out of date; run: UPDATE_ROUTES=1 go test ./cmd/api -run TestRouteManifest")
	}
}
