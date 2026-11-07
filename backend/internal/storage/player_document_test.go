package storage

import (
	"bytes"
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Identity documents must never be served through the public base URL and
// must only be readable by whoever manages the player.
func TestPlayerDocumentsArePrivate(t *testing.T) {
	playerID := uuid.New()
	store := NewFakeStore()
	cfg := Config{MaxImageUploadBytes: 10 << 20, MaxReleaseUploadBytes: 150 << 20, PresignTTL: 15 * time.Minute, PublicBaseURL: "https://cdn.example"}
	owner := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}
	svc := NewService(store, &fakeAuthz{canManagePlayer: true, playerID: playerID}, cfg)
	ctx := context.Background()

	pdf := []byte("%PDF-1.4\n%fake identity document\n")
	res, err := svc.Upload(ctx, owner, ScopePlayerDocument, playerID, bytes.NewReader(pdf), int64(len(pdf)), "ine.pdf")
	if err != nil {
		t.Fatalf("upload pdf: %v", err)
	}
	if res.IsPublic || res.URL != "" && strings.HasPrefix(res.URL, cfg.PublicBaseURL) {
		t.Fatalf("document upload exposed a public URL: %+v", res)
	}
	if !strings.HasPrefix(res.Key, "player_document/"+playerID.String()+"/") || !strings.HasSuffix(res.Key, ".pdf") {
		t.Fatalf("unexpected key %q", res.Key)
	}

	url, err := svc.URL(ctx, owner, res.Key)
	if err != nil {
		t.Fatalf("owner URL: %v", err)
	}
	if strings.HasPrefix(url, cfg.PublicBaseURL) {
		t.Fatalf("document served via public base URL: %s", url)
	}

	stranger := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}
	other := NewService(store, &fakeAuthz{}, cfg)
	if _, err := other.URL(ctx, stranger, res.Key); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("stranger URL err = %v, want forbidden", err)
	}
	if _, err := other.URL(ctx, auth.Principal{}, res.Key); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("anonymous URL err = %v, want forbidden", err)
	}

	zip := []byte("PK\x03\x04 not an id document")
	if _, err := svc.Upload(ctx, owner, ScopePlayerDocument, playerID, bytes.NewReader(zip), int64(len(zip)), "x.zip"); err == nil {
		t.Fatal("zip accepted as identity document")
	}
}
