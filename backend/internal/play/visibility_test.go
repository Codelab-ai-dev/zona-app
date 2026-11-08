package play

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Private or unfinished videos are hidden from everyone but the league's
// managers (they were readable by anyone who had the ID).
func TestGetRecordingVisibility(t *testing.T) {
	league := uuid.New()
	newSvc := func(rec Recording, manages bool) *Service {
		repo := &FakeRepository{GetRecordingFunc: func(context.Context, uuid.UUID) (*Recording, error) {
			r := rec
			return &r, nil
		}}
		authz := &FakeAuthzChecker{CanManageLeagueFunc: func(context.Context, auth.Principal, uuid.UUID) error {
			if manages {
				return nil
			}
			return httpx.ErrForbidden
		}}
		return NewService(repo, &FakeMuxClient{}, authz)
	}
	viewer := &auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}
	cases := []struct {
		name       string
		rec        Recording
		caller     *auth.Principal
		manages    bool
		wantHidden bool
	}{
		{"public ready, anonymous", Recording{Status: "ready", Visibility: "public"}, nil, false, false},
		{"unlisted ready, anonymous (shared link)", Recording{Status: "ready", Visibility: "unlisted"}, nil, false, false},
		{"private, anonymous", Recording{Status: "ready", Visibility: "private"}, nil, false, true},
		{"private, other user", Recording{Status: "ready", Visibility: "private"}, viewer, false, true},
		{"processing, anonymous", Recording{Status: "processing", Visibility: "public"}, nil, false, true},
		{"private, league manager", Recording{Status: "ready", Visibility: "private"}, viewer, true, false},
	}
	for _, tc := range cases {
		tc.rec.ID, tc.rec.LeagueID = uuid.New(), &league
		_, err := newSvc(tc.rec, tc.manages).GetRecording(context.Background(), tc.caller, tc.rec.ID)
		hidden := errors.Is(err, httpx.ErrNotFound)
		if hidden != tc.wantHidden {
			t.Errorf("%s: hidden=%v (err %v), want %v", tc.name, hidden, err, tc.wantHidden)
		}
	}
}
