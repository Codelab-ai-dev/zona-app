package play

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Without Mux, uploads answer 503 (not 500) and listings keep working.
func TestUnconfiguredProvider(t *testing.T) {
	repo := &FakeRepository{}
	svc := NewService(repo, UnconfiguredProvider{}, &FakeAuthzChecker{})
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	leagueID := uuid.New()

	_, err := svc.CreateDirectUpload(context.Background(), caller, &RecordingRequest{Title: "Final", LeagueID: &leagueID})
	var apiErr *httpx.Error
	if !errors.As(err, &apiErr) || apiErr.Status != http.StatusServiceUnavailable {
		t.Fatalf("upload without Mux: got %v, want 503", err)
	}
}
