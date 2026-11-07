//go:build integration

package leagues

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestGetLeagueByID_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	league, err := repo.GetLeagueByID(context.Background(), f.LeagueID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.ID != f.LeagueID {
		t.Errorf("expected ID %v, got %v", f.LeagueID, league.ID)
	}
	if league.Name != "Liga Test" {
		t.Errorf("expected name 'Liga Test', got %q", league.Name)
	}
	if league.AdminID != f.LeagueAdminID {
		t.Errorf("expected admin_id %v, got %v", f.LeagueAdminID, league.AdminID)
	}
}

func TestGetLeagueBySlug_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	league, err := repo.GetLeagueBySlug(context.Background(), f.LeagueSlug)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.ID != f.LeagueID {
		t.Errorf("expected ID %v, got %v", f.LeagueID, league.ID)
	}
}

func TestListActiveLeagues_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	leagues, total, err := repo.ListActiveLeagues(context.Background(), 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total < 1 {
		t.Errorf("expected at least 1 league, got %d", total)
	}

	found := false
	for _, l := range leagues {
		if l.ID == f.LeagueID {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("seeded league not found in list")
	}
}

func TestCreateLeague_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	defaultFeatures, _ := json.Marshal(map[string]bool{
		"ai_agent":           true,
		"qr_codes":           true,
		"mobile_app":         true,
		"statistics":         true,
		"manual_entry":       true,
		"public_portal":      true,
		"realtime_updates":   true,
		"facial_recognition": true,
	})

	l := &League{
		ID:          uuid.New(),
		Name:        "Integration Test League",
		Slug:        "integration-test-" + uuid.New().String()[:8],
		Description: "Test league",
		AdminID:     f.LeagueAdminID,
		IsActive:    true,
		ProductMode: "full",
		Features:    json.RawMessage(defaultFeatures),
	}

	id, err := repo.CreateLeague(context.Background(), l)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if id == uuid.Nil {
		t.Errorf("expected non-nil ID")
	}

	// Verify it was created
	created, err := repo.GetLeagueByID(context.Background(), id)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if created.Name != "Integration Test League" {
		t.Errorf("expected name 'Integration Test League', got %q", created.Name)
	}
}

func TestUpdateLeague_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	league, err := repo.GetLeagueByID(context.Background(), f.LeagueID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	newName := "Updated Liga Test"
	league.Name = newName

	err = repo.UpdateLeague(context.Background(), &league)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify update
	updated, err := repo.GetLeagueByID(context.Background(), f.LeagueID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updated.Name != newName {
		t.Errorf("expected name %q, got %q", newName, updated.Name)
	}
}

func TestUpdateLeagueProductMode_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	features, _ := json.Marshal(map[string]bool{"web_only": true})

	err := repo.UpdateLeagueProductMode(context.Background(), f.LeagueID, "web_only", features, f.LeagueAdminID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify update
	updated, err := repo.GetLeagueByID(context.Background(), f.LeagueID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updated.ProductMode != "web_only" {
		t.Errorf("expected product_mode 'web_only', got %q", updated.ProductMode)
	}

	if updated.ModeUpdatedBy == nil || *updated.ModeUpdatedBy != f.LeagueAdminID {
		t.Errorf("expected mode_updated_by %v, got %v", f.LeagueAdminID, updated.ModeUpdatedBy)
	}
}

func TestGetTournamentByID_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	tournament, err := repo.GetTournamentByID(context.Background(), f.TournamentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if tournament.ID != f.TournamentID {
		t.Errorf("expected ID %v, got %v", f.TournamentID, tournament.ID)
	}
	if tournament.LeagueID != f.LeagueID {
		t.Errorf("expected league_id %v, got %v", f.LeagueID, tournament.LeagueID)
	}
	if tournament.Name != "Apertura" {
		t.Errorf("expected name 'Apertura', got %q", tournament.Name)
	}
}

func TestListTournamentsByLeague_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	tournaments, total, err := repo.ListTournamentsByLeague(context.Background(), f.LeagueID, 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total < 1 {
		t.Errorf("expected at least 1 tournament, got %d", total)
	}

	found := false
	for _, trn := range tournaments {
		if trn.ID == f.TournamentID {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("seeded tournament not found in list")
	}
}

func TestCreateTournament_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	maxCoach := 10
	t_obj := &Tournament{
		ID:                 uuid.New(),
		Name:               "Integration Test Tournament",
		LeagueID:           f.LeagueID,
		StartDate:          "2026-01-01",
		EndDate:            "2026-12-31",
		IsActive:           false,
		TournamentFormat:   "league",
		RegistrationOpen:   true,
		MaxCoachingStaff:   &maxCoach,
		RoundsPerSeason:    1,
		HasThirdPlaceMatch: false,
	}

	id, err := repo.CreateTournament(context.Background(), t_obj)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if id == uuid.Nil {
		t.Errorf("expected non-nil ID")
	}

	// Verify it was created
	created, err := repo.GetTournamentByID(context.Background(), id)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if created.Name != "Integration Test Tournament" {
		t.Errorf("expected name 'Integration Test Tournament', got %q", created.Name)
	}
	if created.LeagueID != f.LeagueID {
		t.Errorf("expected league_id %v, got %v", f.LeagueID, created.LeagueID)
	}
}

func TestUpdateTournament_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	tournament, err := repo.GetTournamentByID(context.Background(), f.TournamentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	newName := "Updated Apertura"
	tournament.Name = newName
	tournament.IsActive = true

	err = repo.UpdateTournament(context.Background(), &tournament)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify update
	updated, err := repo.GetTournamentByID(context.Background(), f.TournamentID)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if updated.Name != newName {
		t.Errorf("expected name %q, got %q", newName, updated.Name)
	}
	if !updated.IsActive {
		t.Errorf("expected is_active=true, got false")
	}
}

func TestListAllLeagues_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	_ = testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	leagues, total, err := repo.ListAllLeagues(context.Background(), 50, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if total < 1 {
		t.Errorf("expected at least 1 league, got %d", total)
	}
	if len(leagues) < 1 {
		t.Errorf("expected at least 1 league in result, got %d", len(leagues))
	}
}

func TestPagination_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	tournaments, total, err := repo.ListTournamentsByLeague(context.Background(), f.LeagueID, 1, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(tournaments) > 1 {
		t.Errorf("expected limit of 1, got %d results", len(tournaments))
	}

	if total < len(tournaments) {
		t.Errorf("expected total to be >= results count, got total=%d results=%d", total, len(tournaments))
	}
}
