package teams

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func TestVerifyPlayer(t *testing.T) {
	leagueID, teamID, playerID := uuid.New(), uuid.New(), uuid.New()
	ownDoc := "player_document/" + playerID.String() + "/" + uuid.NewString() + ".pdf"
	otherDoc := "player_document/" + uuid.NewString() + "/" + uuid.NewString() + ".pdf"

	newSvc := func(checker *fakeAuthzChecker) *Service {
		repo := newFakeRepository()
		repo.teams[teamID] = Team{ID: teamID, LeagueID: leagueID}
		repo.players[playerID] = Player{ID: playerID, TeamID: teamID}
		return NewService(repo, nil, checker)
	}
	admin := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	owner := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}

	tests := []struct {
		name    string
		caller  auth.Principal
		checker *fakeAuthzChecker
		req     VerifyPlayerRequest
		wantErr *httpx.Error
	}{
		{"league admin verifies with the player's document", admin, &fakeAuthzChecker{allowedLeagues: map[uuid.UUID]bool{leagueID: true}}, VerifyPlayerRequest{Verified: true, DocumentKey: &ownDoc}, nil},
		{"team owner cannot verify own player", owner, &fakeAuthzChecker{allowedTeams: map[uuid.UUID]bool{teamID: true}, allowedPlayers: map[uuid.UUID]bool{playerID: true}}, VerifyPlayerRequest{Verified: true, DocumentKey: &ownDoc}, httpx.ErrForbidden},
		{"admin of another league", admin, &fakeAuthzChecker{allowedLeagues: map[uuid.UUID]bool{uuid.New(): true}}, VerifyPlayerRequest{Verified: true, DocumentKey: &ownDoc}, httpx.ErrForbidden},
		{"another player's document is rejected", admin, &fakeAuthzChecker{allowedLeagues: map[uuid.UUID]bool{leagueID: true}}, VerifyPlayerRequest{Verified: true, DocumentKey: &otherDoc}, &httpx.Error{Code: "validation_failed"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			v, err := newSvc(tt.checker).VerifyPlayer(context.Background(), tt.caller, playerID, tt.req)
			if tt.wantErr == nil {
				if err != nil || !v.Verified || v.Method == nil || *v.Method != "manual" {
					t.Fatalf("got %+v, %v", v, err)
				}
				return
			}
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
		})
	}
}

func TestVerifyPlayerRequestValidate(t *testing.T) {
	bad := "player/" + uuid.NewString() + "/" + uuid.NewString() + ".jpg" // public scope, not a document
	cases := map[string]VerifyPlayerRequest{
		"verify without document": {Verified: true},
		"key from public scope":   {Verified: true, DocumentKey: &bad},
	}
	for name, req := range cases {
		if len(req.Validate()) == 0 {
			t.Errorf("%s: expected validation error", name)
		}
	}
	if len((VerifyPlayerRequest{Verified: false}).Validate()) != 0 {
		t.Error("un-verifying without a document must be allowed")
	}
}
