//go:build integration

package notifications

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGRepository_AgainstSchema(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Unique per run: the integration database is shared and not reset.
	phone := fmt.Sprintf("52155%08d", time.Now().UnixNano()%100000000)
	if _, err := pool.Exec(ctx,
		`INSERT INTO public.whatsapp_user_links (phone_number, league_id, role) VALUES ($1, $2, 'user')`,
		phone, f.LeagueID); err != nil {
		t.Fatal(err)
	}

	league, err := repo.GetLeagueData(ctx, f.LeagueID, f.TournamentID, 1)
	if err != nil {
		t.Fatalf("GetLeagueData: %v", err)
	}
	if len(league.Matches) != 1 || league.Matches[0].Time != "18:30" {
		t.Errorf("matches = %+v, want one match at 18:30", league.Matches)
	}

	match, err := repo.GetMatchData(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchData: %v", err)
	}
	if match.HomeScore != 2 || match.AwayScore != 1 {
		t.Errorf("score = %d-%d, want 2-1", match.HomeScore, match.AwayScore)
	}

	recipients, err := repo.GetLeagueRecipients(ctx, f.LeagueID)
	if err != nil || len(recipients) != 1 {
		t.Fatalf("GetLeagueRecipients = %v, %v", recipients, err)
	}
	if _, err := repo.GetMatchRecipients(ctx, f.MatchID); err != nil {
		t.Fatalf("GetMatchRecipients: %v", err)
	}
	if ok, err := repo.PhoneNumberExists(ctx, phone); err != nil || !ok {
		t.Fatalf("PhoneNumberExists = %v, %v", ok, err)
	}
	if _, err := repo.GetMatchData(ctx, uuid.New()); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("missing match err = %v, want not found", err)
	}
}
