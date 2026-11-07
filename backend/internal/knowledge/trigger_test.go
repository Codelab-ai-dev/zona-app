package knowledge

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// triggerRepo records which generator ran and can simulate ownership failures.
type triggerRepo struct {
	fakeRepository
	tournamentErr error
	matchErr      error
	generated     string
	updatedID     uuid.UUID
}

func (r *triggerRepo) ValidateTournamentBelongsToLeague(context.Context, uuid.UUID, uuid.UUID) error {
	return r.tournamentErr
}

func (r *triggerRepo) ValidateMatchBelongsToTournament(context.Context, uuid.UUID, uuid.UUID) error {
	return r.matchErr
}

func (r *triggerRepo) GenerateStandingsContent(context.Context, uuid.UUID, uuid.UUID) (uuid.UUID, string, error) {
	r.generated = "standings"
	return uuid.New(), "tabla", nil
}

func (r *triggerRepo) GenerateMatchResultContent(context.Context, uuid.UUID) (uuid.UUID, string, error) {
	r.generated = "match"
	return uuid.New(), "resultado", nil
}

func (r *triggerRepo) GenerateJornadaContent(_ context.Context, _, _ uuid.UUID, _ int) (uuid.UUID, string, error) {
	r.generated = "jornada"
	return uuid.New(), "jornada", nil
}

func (r *triggerRepo) UpdateEmbedding(_ context.Context, id uuid.UUID, _ []float32) error {
	r.updatedID = id
	return nil
}

func TestProcessTrigger(t *testing.T) {
	matchID := uuid.New()
	round := 3
	admin := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	base := TriggerEmbeddingRequest{LeagueID: uuid.New(), TournamentID: uuid.New()}

	with := func(trigger string, mutate func(*TriggerEmbeddingRequest)) TriggerEmbeddingRequest {
		req := base
		req.TriggerType = trigger
		if mutate != nil {
			mutate(&req)
		}
		return req
	}

	tests := []struct {
		name          string
		req           TriggerEmbeddingRequest
		authz         *fakeAuthz
		repo          *triggerRepo
		wantGenerated string
		wantErr       *httpx.Error
	}{
		{name: "standings", req: with("standings_update", nil), authz: &fakeAuthz{canManage: true}, repo: &triggerRepo{}, wantGenerated: "standings"},
		{name: "match result", req: with("match_result_update", func(r *TriggerEmbeddingRequest) { r.MatchID = &matchID }), authz: &fakeAuthz{canManage: true}, repo: &triggerRepo{}, wantGenerated: "match"},
		{name: "jornada", req: with("jornada_update", func(r *TriggerEmbeddingRequest) { r.Round = &round }), authz: &fakeAuthz{canManage: true}, repo: &triggerRepo{}, wantGenerated: "jornada"},
		{name: "foreign league is forbidden", req: with("standings_update", nil), authz: &fakeAuthz{canManage: false}, repo: &triggerRepo{}, wantErr: httpx.ErrForbidden},
		{name: "tournament from another league", req: with("standings_update", nil), authz: &fakeAuthz{canManage: true}, repo: &triggerRepo{tournamentErr: httpx.ErrNotFound}, wantErr: httpx.ErrNotFound},
		{name: "match from another tournament", req: with("match_result_update", func(r *TriggerEmbeddingRequest) { r.MatchID = &matchID }), authz: &fakeAuthz{canManage: true}, repo: &triggerRepo{matchErr: httpx.ErrNotFound}, wantErr: httpx.ErrNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			emb := &fakeEmbedder{embeddings: [][]float32{{0.1, 0.2}}}
			svc := NewService(tt.repo, emb, tt.authz)

			_, err := svc.ProcessTrigger(context.Background(), admin, tt.req)

			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("err = %v, want %v", err, tt.wantErr)
				}
				if tt.repo.generated != "" {
					t.Fatalf("content was generated despite failed check: %s", tt.repo.generated)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if tt.repo.generated != tt.wantGenerated {
				t.Errorf("generated = %q, want %q", tt.repo.generated, tt.wantGenerated)
			}
			if tt.repo.updatedID == uuid.Nil {
				t.Error("embedding was not stored")
			}
		})
	}
}
