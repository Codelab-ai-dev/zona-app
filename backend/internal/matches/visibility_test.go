package matches

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func TestMatchVisibility(t *testing.T) {
	activeT, inactiveT := uuid.New(), uuid.New()
	published := Match{ID: uuid.New(), TournamentID: activeT, IsPublished: true}
	draft := Match{ID: uuid.New(), TournamentID: activeT, IsPublished: false}
	ofInactive := Match{ID: uuid.New(), TournamentID: inactiveT, IsPublished: true}

	repo := newFakeRepository()
	repo.inactive = map[uuid.UUID]bool{inactiveT: true}
	for _, m := range []Match{published, draft, ofInactive} {
		repo.matches[m.ID] = m
	}
	all := []Match{published, draft, ofInactive}

	user := auth.WithPrincipal(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RolePublic})
	tests := []struct {
		name    string
		ctx     context.Context
		manager bool
		want    int
	}{
		{"anonymous sees only published of active leagues", context.Background(), false, 1},
		{"authenticated non-manager sees the same", user, false, 1},
		{"tournament manager sees everything", user, true, 3},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(repo, &fakeChecker{canManageTournament: tt.manager}, nil)
			got, err := svc.visibleMatches(tt.ctx, all)
			if err != nil {
				t.Fatal(err)
			}
			if len(got) != tt.want {
				t.Fatalf("visible = %d, want %d", len(got), tt.want)
			}
		})
	}

	svc := NewService(repo, &fakeChecker{}, nil)
	if _, err := svc.GetMatch(context.Background(), draft.ID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("GetMatch(draft) err = %v, want not found", err)
	}
	if _, err := svc.GetMatch(context.Background(), published.ID); err != nil {
		t.Fatalf("GetMatch(published) err = %v", err)
	}
}
