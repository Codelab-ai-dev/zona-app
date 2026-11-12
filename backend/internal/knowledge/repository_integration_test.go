//go:build integration

package knowledge

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGRepository_AgainstSchema(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	if err := repo.ValidateTournamentBelongsToLeague(ctx, f.LeagueID, f.TournamentID); err != nil {
		t.Fatalf("own tournament: %v", err)
	}
	if err := repo.ValidateTournamentBelongsToLeague(ctx, f.LeagueID, other.TournamentID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("foreign tournament err = %v, want not found", err)
	}
	if err := repo.ValidateMatchBelongsToTournament(ctx, other.MatchID, f.TournamentID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("foreign match err = %v, want not found", err)
	}

	// The match-result row is written by the trigger that fires when a match
	// is updated to finished, exactly as in production.
	if _, err := pool.Exec(ctx, `UPDATE public.matches SET status = 'finished' WHERE id = $1`, f.MatchID); err != nil {
		t.Fatal(err)
	}

	vec := make([]float32, 1536)
	for name, gen := range map[string]func() (uuid.UUID, string, error){
		"standings": func() (uuid.UUID, string, error) {
			return repo.GenerateStandingsContent(ctx, f.LeagueID, f.TournamentID)
		},
		"match": func() (uuid.UUID, string, error) { return repo.GenerateMatchResultContent(ctx, f.MatchID) },
		"jornada": func() (uuid.UUID, string, error) {
			return repo.GenerateJornadaContent(ctx, f.LeagueID, f.TournamentID, 1)
		},
	} {
		t.Run(name, func(t *testing.T) {
			id, content, err := gen()
			if err != nil {
				t.Fatalf("generate: %v", err)
			}
			if content == "" {
				t.Fatal("empty content")
			}
			if err := repo.UpdateEmbedding(ctx, id, vec); err != nil {
				t.Fatalf("UpdateEmbedding: %v", err)
			}
		})
	}
}
