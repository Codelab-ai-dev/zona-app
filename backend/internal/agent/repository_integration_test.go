//go:build integration

package agent

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestIdentityResolution(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()
	phone := "52155" + uuid.NewString()[:8]

	if _, err := pool.Exec(ctx, `INSERT INTO public.whatsapp_user_links (phone_number, league_id, role, display_name) VALUES ($1, $2, 'user', 'Fan')`, phone, f.LeagueID); err != nil {
		t.Fatal(err)
	}

	id, err := repo.ByWhatsApp(ctx, phone)
	if err != nil {
		t.Fatalf("ByWhatsApp: %v", err)
	}
	if id.LeagueID != f.LeagueID || id.TournamentID == nil || *id.TournamentID != f.TournamentID || id.WhatsAppLinkID == nil {
		t.Fatalf("unexpected identity: %+v", id)
	}

	owner, err := repo.ByUser(ctx, f.TeamOwnerID)
	if err != nil || owner.LeagueID != f.LeagueID {
		t.Fatalf("ByUser(owner) = %+v, %v", owner, err)
	}
	admin, err := repo.ByUser(ctx, f.LeagueAdminID)
	if err != nil || admin.LeagueID != f.LeagueID {
		t.Fatalf("ByUser(admin) = %+v, %v", admin, err)
	}

	if _, err := repo.ByWhatsApp(ctx, "52100000000"); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("unknown phone err = %v, want ErrNotLinked", err)
	}

	if _, err := pool.Exec(ctx, `UPDATE public.leagues SET is_active = false WHERE id = $1`, f.LeagueID); err != nil {
		t.Fatal(err)
	}
	if _, err := repo.ByWhatsApp(ctx, phone); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("inactive league err = %v, want ErrNotLinked", err)
	}
	if _, err := repo.ByUser(ctx, f.TeamOwnerID); !errors.Is(err, ErrNotLinked) {
		t.Fatalf("inactive league (user) err = %v, want ErrNotLinked", err)
	}
}

func TestKnowledgeSearchIsLeagueScoped(t *testing.T) {
	pool := testdb.Pool(t)
	mine := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	vec := make([]float32, 1536)
	vec[0] = 1
	for _, l := range []struct {
		league uuid.UUID
		text   string
	}{{mine.LeagueID, "dato propio"}, {other.LeagueID, "dato ajeno"}} {
		if _, err := pool.Exec(ctx, `
			INSERT INTO public.league_knowledge_base (league_id, content_type, content_text, embedding, valid_from)
			VALUES ($1, 'resultados', $2, $3::vector, $4)`, l.league, l.text, vectorLiteral(vec), time.Now().Add(-time.Hour)); err != nil {
			t.Fatal(err)
		}
	}

	chunks, err := repo.Search(ctx, vec, mine.LeagueID, nil, 10)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	for _, c := range chunks {
		if c.Content == "dato ajeno" {
			t.Fatal("search leaked another league's knowledge")
		}
	}
	if len(chunks) == 0 {
		t.Fatal("expected the league's own knowledge")
	}
}

func TestConversationSave(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	id, err := NewPGRepository(pool).Save(context.Background(), ConversationLog{
		Channel: ChannelWeb, UserIdentifier: f.TeamOwnerID.String(), LeagueID: f.LeagueID,
		UserMessage: "tabla", Response: "ok", Intent: IntentStandings, Confidence: 0.8, Latency: time.Second,
	})
	if err != nil || id == uuid.Nil {
		t.Fatalf("Save = %v, %v", id, err)
	}
}
