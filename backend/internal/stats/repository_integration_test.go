//go:build integration

package stats

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGRepository_GetStandingsByTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert team stats for the fixture tournament
	_, err := pool.Exec(ctx, `
		INSERT INTO public.team_stats (
			id, team_id, tournament_id, league_id, matches_played, matches_won,
			matches_drawn, matches_lost, goals_for, goals_against, clean_sheets,
			yellow_cards, red_cards, points_adjustment, adjustment_reason
		) VALUES
		($1, $2, $3, $4, 10, 8, 1, 1, 25, 5, 3, 2, 0, 0, NULL),
		($5, $6, $3, $4, 10, 5, 3, 2, 18, 12, 1, 5, 1, -3, 'Poor conduct')
	`, uuid.New(), f.HomeTeamID, f.TournamentID, f.LeagueID, uuid.New(), f.AwayTeamID)
	if err != nil {
		t.Fatalf("insert team_stats: %v", err)
	}

	standings, err := repo.GetStandingsByTournament(ctx, f.TournamentID, 100)
	if err != nil {
		t.Fatalf("GetStandingsByTournament: %v", err)
	}

	if len(standings) != 2 {
		t.Fatalf("standings count = %d, want 2", len(standings))
	}

	if standings[0].PointsAdjustment != 0 || standings[1].PointsAdjustment != -3 {
		t.Errorf("points_adjustment order incorrect: got %d, %d", standings[0].PointsAdjustment, standings[1].PointsAdjustment)
	}
}

func TestPGRepository_GetTeamStats(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert team stats
	teamStatsID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO public.team_stats (
			id, team_id, tournament_id, league_id, matches_played, matches_won,
			matches_drawn, matches_lost, goals_for, goals_against, clean_sheets,
			yellow_cards, red_cards, points_adjustment, adjustment_reason
		) VALUES ($1, $2, $3, $4, 5, 3, 1, 1, 10, 5, 1, 2, 0, 3, 'Fair play award')
	`, teamStatsID, f.HomeTeamID, f.TournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert team_stats: %v", err)
	}

	stats, err := repo.GetTeamStats(ctx, f.HomeTeamID, &f.TournamentID)
	if err != nil {
		t.Fatalf("GetTeamStats: %v", err)
	}

	if stats.MatchesPlayed != 5 || stats.Points != 10 {
		t.Errorf("stats = %+v, want 5 matches played and 10 points", stats)
	}

	if stats.PointsAdjustment != 3 || *stats.AdjustmentReason != "Fair play award" {
		t.Errorf("adjustment = %d, %s", stats.PointsAdjustment, *stats.AdjustmentReason)
	}
}

func TestPGRepository_UpdateTeamPointsAdjustment(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert team stats
	_, err := pool.Exec(ctx, `
		INSERT INTO public.team_stats (
			id, team_id, tournament_id, league_id, matches_played, matches_won,
			matches_drawn, matches_lost, goals_for, goals_against, clean_sheets,
			yellow_cards, red_cards
		) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	`, uuid.New(), f.HomeTeamID, f.TournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert team_stats: %v", err)
	}

	// Update points adjustment
	if err := repo.UpdateTeamPointsAdjustment(ctx, f.HomeTeamID, f.TournamentID, 5, "Test adjustment"); err != nil {
		t.Fatalf("UpdateTeamPointsAdjustment: %v", err)
	}

	// Verify update
	stats, err := repo.GetTeamStats(ctx, f.HomeTeamID, &f.TournamentID)
	if err != nil {
		t.Fatalf("GetTeamStats after update: %v", err)
	}

	if stats.PointsAdjustment != 5 || *stats.AdjustmentReason != "Test adjustment" {
		t.Errorf("updated adjustment = %d, %s; want 5, 'Test adjustment'", stats.PointsAdjustment, *stats.AdjustmentReason)
	}
}

func TestPGRepository_GetPlayerStats(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// player_stats is unique per (player, match), so aggregate across two matches.
	secondMatch := uuid.New()
	if _, err := pool.Exec(ctx, `
		INSERT INTO public.matches (id, tournament_id, home_team_id, away_team_id, match_date, round, status)
		VALUES ($1, $2, $3, $4, now(), 2, 'scheduled')
	`, secondMatch, f.TournamentID, f.HomeTeamID, f.AwayTeamID); err != nil {
		t.Fatalf("insert second match: %v", err)
	}
	_, err := pool.Exec(ctx, `
		INSERT INTO public.player_stats (id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
		VALUES
		($1, $2, $3, 1, 0, 0, 0, 45),
		($4, $2, $5, 2, 1, 1, 0, 90)
	`, uuid.New(), f.HomePlayerID, f.MatchID, uuid.New(), secondMatch)
	if err != nil {
		t.Fatalf("insert player_stats: %v", err)
	}

	stats, err := repo.GetPlayerStats(ctx, f.HomePlayerID)
	if err != nil {
		t.Fatalf("GetPlayerStats: %v", err)
	}

	if stats.MatchesPlayed != 2 || stats.Goals != 3 || stats.Assists != 1 {
		t.Errorf("stats = %+v, want 2 matches, 3 goals, 1 assist", stats)
	}
}

func TestPGRepository_GetTopScorersByTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert player stats using fixture's valid match
	_, err := pool.Exec(ctx, `
		INSERT INTO public.player_stats (id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
		VALUES ($1, $2, $3, 5, 2, 0, 0, 90)
	`, uuid.New(), f.HomePlayerID, f.MatchID)
	if err != nil {
		t.Fatalf("insert player_stats: %v", err)
	}

	scorers, err := repo.GetTopScorersByTournament(ctx, f.TournamentID, 20)
	if err != nil {
		t.Fatalf("GetTopScorersByTournament: %v", err)
	}

	if len(scorers) < 1 {
		t.Fatalf("no scorers returned")
	}

	found := false
	for _, s := range scorers {
		if s.PlayerID == f.HomePlayerID {
			found = true
			if s.Goals != 5 || s.Assists != 2 {
				t.Errorf("scorer stats = goals:%d assists:%d, want 5:2", s.Goals, s.Assists)
			}
			break
		}
	}

	if !found {
		t.Errorf("player not found in top scorers")
	}
}

func TestPGRepository_GetDisciplineByTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert player stats with cards (respecting CHECK constraints: max 2 yellows, 1 red)
	_, err := pool.Exec(ctx, `
		INSERT INTO public.player_stats (id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
		VALUES ($1, $2, $3, 0, 0, 2, 1, 90)
	`, uuid.New(), f.HomePlayerID, f.MatchID)
	if err != nil {
		t.Fatalf("insert player_stats: %v", err)
	}

	discipline, err := repo.GetDisciplineByTournament(ctx, f.TournamentID, 20)
	if err != nil {
		t.Fatalf("GetDisciplineByTournament: %v", err)
	}

	if len(discipline) < 1 {
		t.Fatalf("no discipline records returned")
	}

	found := false
	for _, d := range discipline {
		if d.PlayerID == f.HomePlayerID {
			found = true
			if d.YellowCards != 2 || d.RedCards != 1 {
				t.Errorf("discipline stats = yellow:%d red:%d, want 2:1", d.YellowCards, d.RedCards)
			}
			break
		}
	}

	if !found {
		t.Errorf("player not found in discipline")
	}
}

func TestPGRepository_GetPlayerStatsByTeam(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Insert player stats using fixture's match
	_, err := pool.Exec(ctx, `
		INSERT INTO public.player_stats (id, player_id, match_id, goals, assists, yellow_cards, red_cards, minutes_played)
		VALUES ($1, $2, $3, 2, 1, 0, 0, 90)
	`, uuid.New(), f.HomePlayerID, f.MatchID)
	if err != nil {
		t.Fatalf("insert player_stats: %v", err)
	}

	stats, err := repo.GetPlayerStatsByTeam(ctx, f.HomeTeamID, nil)
	if err != nil {
		t.Fatalf("GetPlayerStatsByTeam: %v", err)
	}

	if len(stats) < 1 {
		t.Fatalf("no player stats returned")
	}

	if stats[0].Goals != 2 || stats[0].Assists != 1 {
		t.Errorf("player stats = %+v, want 2 goals 1 assist", stats[0])
	}
}

func TestPGRepository_CreateSuspension(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}

	suspension, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	if suspension.ID == uuid.Nil || suspension.Status != "active" || suspension.MatchesToServe != 2 {
		t.Errorf("suspension = %+v", suspension)
	}

	retrieved, err := repo.GetSuspensionByID(ctx, suspension.ID)
	if err != nil {
		t.Fatalf("GetSuspensionByID after create: %v", err)
	}

	if retrieved.PlayerID != f.HomePlayerID || retrieved.SuspensionType != "red_card" {
		t.Errorf("retrieved suspension = %+v", retrieved)
	}
}

func TestPGRepository_UpdateSuspension(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}
	suspension, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	newMatches := 3
	updReq := &UpdateSuspensionRequest{
		MatchesToServe: &newMatches,
	}
	updated, err := repo.UpdateSuspension(ctx, suspension.ID, updReq)
	if err != nil {
		t.Fatalf("UpdateSuspension: %v", err)
	}

	if updated.MatchesToServe != 3 {
		t.Errorf("MatchesToServe after update = %d, want 3", updated.MatchesToServe)
	}
}

func TestPGRepository_CancelSuspension(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}
	suspension, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	cancelled, err := repo.CancelSuspension(ctx, suspension.ID)
	if err != nil {
		t.Fatalf("CancelSuspension: %v", err)
	}

	if cancelled.Status != "cancelled" || cancelled.EndDate == nil {
		t.Errorf("cancelled suspension status = %s, want 'cancelled'", cancelled.Status)
	}
}

func TestPGRepository_CompleteSuspension(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}
	suspension, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	completed, err := repo.CompleteSuspension(ctx, suspension.ID)
	if err != nil {
		t.Fatalf("CompleteSuspension: %v", err)
	}

	if completed.Status != "completed" || completed.EndDate == nil {
		t.Errorf("completed suspension status = %s, want 'completed'", completed.Status)
	}
}

func TestPGRepository_ApplySuspensionToMatch(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}
	suspension, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	if err := repo.ApplySuspensionToMatch(ctx, suspension.ID, f.MatchID); err != nil {
		t.Fatalf("ApplySuspensionToMatch: %v", err)
	}

	var count int
	if err := pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM public.suspension_match_applications
		WHERE suspension_id = $1 AND match_id = $2
	`, suspension.ID, f.MatchID).Scan(&count); err != nil {
		t.Fatalf("verify application: %v", err)
	}

	if count != 1 {
		t.Errorf("suspension application count = %d, want 1", count)
	}
}

func TestPGRepository_GetSuspensionsByLeague(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := &CreateSuspensionRequest{
		PlayerID:       f.HomePlayerID,
		TeamID:         f.HomeTeamID,
		SuspensionType: "red_card",
		Reason:         "Violent conduct",
		MatchesToServe: 2,
	}
	_, err := repo.CreateSuspension(ctx, f.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateSuspension: %v", err)
	}

	suspensions, err := repo.GetSuspensionsByLeague(ctx, f.LeagueID)
	if err != nil {
		t.Fatalf("GetSuspensionsByLeague: %v", err)
	}

	if len(suspensions) < 1 {
		t.Fatalf("no suspensions returned")
	}

	if suspensions[0].LeagueID != f.LeagueID {
		t.Errorf("suspension league_id = %s, want %s", suspensions[0].LeagueID, f.LeagueID)
	}
}

func TestPGRepository_NotFound(t *testing.T) {
	pool := testdb.Pool(t)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	nonexistentID := uuid.New()

	_, err := repo.GetTeamStats(ctx, nonexistentID, nil)
	if !errors.Is(err, httpx.ErrNotFound) {
		t.Errorf("GetTeamStats nonexistent = %v, want not found", err)
	}

	_, err = repo.GetPlayerStats(ctx, nonexistentID)
	if !errors.Is(err, httpx.ErrNotFound) {
		t.Errorf("GetPlayerStats nonexistent = %v, want not found", err)
	}

	_, err = repo.GetSuspensionByID(ctx, nonexistentID)
	if !errors.Is(err, httpx.ErrNotFound) {
		t.Errorf("GetSuspensionByID nonexistent = %v, want not found", err)
	}
}

// TestPGRepository_VerifyTeamBelongsToTournament validates that team_stats only returns
// rows for the requested tournament (prevents cross-tournament authorization bypass).
func TestPGRepository_VerifyTeamBelongsToTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create a second tournament
	otherTournamentID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO public.tournaments (id, name, league_id, start_date, end_date)
		VALUES ($1, 'Clausura', $2, current_date, current_date + 90)
	`, otherTournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert tournament: %v", err)
	}

	// Insert team_stats for home team in other tournament
	_, err = pool.Exec(ctx, `
		INSERT INTO public.team_stats (
			id, team_id, tournament_id, league_id, matches_played, matches_won,
			matches_drawn, matches_lost, goals_for, goals_against, clean_sheets,
			yellow_cards, red_cards
		) VALUES ($1, $2, $3, $4, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	`, uuid.New(), f.HomeTeamID, otherTournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert team_stats for other tournament: %v", err)
	}

	// GetTeamStats with other tournament should return those stats
	statsOther, err := repo.GetTeamStats(ctx, f.HomeTeamID, &otherTournamentID)
	if err != nil {
		t.Fatalf("GetTeamStats for other tournament: %v", err)
	}
	if statsOther.TournamentID != otherTournamentID {
		t.Errorf("returned wrong tournament: got %s, want %s", statsOther.TournamentID, otherTournamentID)
	}

	// GetTeamStats with seed tournament should fail if we didn't insert stats for it
	_, err = repo.GetTeamStats(ctx, f.HomeTeamID, &f.TournamentID)
	if !errors.Is(err, httpx.ErrNotFound) {
		t.Errorf("GetTeamStats for seed tournament should be NotFound, got %v", err)
	}
}

func TestPGRepository_IsPubliclyVisible(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	for scope, id := range map[Scope]uuid.UUID{ScopeTournament: f.TournamentID, ScopeTeam: f.HomeTeamID, ScopePlayer: f.HomePlayerID} {
		if ok, err := repo.IsPubliclyVisible(ctx, scope, id); err != nil || !ok {
			t.Fatalf("%s visible = %v, %v; want true", scope, ok, err)
		}
	}
	if _, err := pool.Exec(ctx, `UPDATE public.leagues SET is_active = false WHERE id = $1`, f.LeagueID); err != nil {
		t.Fatal(err)
	}
	for scope, id := range map[Scope]uuid.UUID{ScopeTournament: f.TournamentID, ScopeTeam: f.HomeTeamID, ScopePlayer: f.HomePlayerID} {
		if ok, err := repo.IsPubliclyVisible(ctx, scope, id); err != nil || ok {
			t.Fatalf("%s visible after deactivation = %v, %v; want false", scope, ok, err)
		}
	}
	if ok, err := repo.IsPubliclyVisible(ctx, ScopeTeam, uuid.New()); err != nil || ok {
		t.Fatalf("missing team visible = %v, %v", ok, err)
	}
}

func TestService_CreateSuspensionDerivesLeague(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	other := testdb.Seed(t, pool)
	svc := NewService(NewPGRepository(pool), authz.NewPGChecker(pool))
	ctx := context.Background()
	admin := auth.Principal{UserID: f.LeagueAdminID, Role: auth.RoleLeagueAdmin, LeagueID: &f.LeagueID, IsActive: true}
	stranger := auth.Principal{UserID: other.LeagueAdminID, Role: auth.RoleLeagueAdmin, LeagueID: &other.LeagueID, IsActive: true}
	req := &CreateSuspensionRequest{PlayerID: f.HomePlayerID, TeamID: f.HomeTeamID, SuspensionType: "red_card", Reason: "Agresión", MatchesToServe: 1}

	// No league in the request: it comes from the player.
	s, err := svc.CreateSuspension(ctx, admin, uuid.Nil, req)
	if err != nil || s.LeagueID != f.LeagueID {
		t.Fatalf("create = %+v %v", s, err)
	}
	if _, err := svc.CreateSuspension(ctx, stranger, uuid.Nil, req); !errors.Is(err, httpx.ErrForbidden) {
		t.Fatalf("stranger: got %v, want forbidden", err)
	}
	if _, err := svc.CreateSuspension(ctx, admin, other.LeagueID, req); err == nil {
		t.Fatal("mismatched league accepted")
	}
	list, err := svc.GetSuspensionsByLeague(ctx, admin, f.LeagueID)
	if err != nil || len(list) != 1 || list[0].PlayerName != "Jugador" || list[0].PlayerJersey != 9 || list[0].TeamName != "Local FC" {
		t.Fatalf("list = %+v %v", list, err)
	}
}
