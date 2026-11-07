//go:build integration

package matches

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestPGRepository_CreateMatch(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := CreateMatchRequest{
		TournamentID: f.TournamentID,
		HomeTeamID:   f.HomeTeamID,
		AwayTeamID:   f.AwayTeamID,
		MatchDate:    time.Now().Add(2 * 24 * time.Hour),
		Round:        intPtr(2),
	}

	match, err := repo.CreateMatch(ctx, req)
	if err != nil {
		t.Fatalf("CreateMatch: %v", err)
	}

	if match.Status != MatchStatusScheduled {
		t.Errorf("status: got %v, want %v", match.Status, MatchStatusScheduled)
	}
	if match.Round == nil || *match.Round != 2 {
		t.Errorf("round: got %v, want 2", match.Round)
	}
}

func TestPGRepository_GetMatchByID(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	match, err := repo.GetMatchByID(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}

	if match.ID != f.MatchID {
		t.Errorf("id: got %v, want %v", match.ID, f.MatchID)
	}
	if match.HomeScore != 2 || match.AwayScore != 1 {
		t.Errorf("score: got %d-%d, want 2-1", match.HomeScore, match.AwayScore)
	}
}

func TestPGRepository_GetMatchByID_NotFound(t *testing.T) {
	pool := testdb.Pool(t)
	testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	_, err := repo.GetMatchByID(ctx, uuid.New())
	if err != httpx.ErrNotFound {
		t.Errorf("error: got %v, want ErrNotFound", err)
	}
}

func TestPGRepository_ListMatchesByTournament(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	matches, err := repo.ListMatchesByTournament(ctx, f.TournamentID, ListMatchesFilter{Limit: 100})
	if err != nil {
		t.Fatalf("ListMatchesByTournament: %v", err)
	}

	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}

	found := false
	for _, m := range matches {
		if m.ID == f.MatchID {
			found = true
			break
		}
	}
	if !found {
		t.Error("seeded match not found in list")
	}
}

func TestPGRepository_ListMatchesByTeam(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	matches, err := repo.ListMatchesByTeam(ctx, f.HomeTeamID, ListMatchesFilter{Limit: 50})
	if err != nil {
		t.Fatalf("ListMatchesByTeam: %v", err)
	}

	if len(matches) == 0 {
		t.Fatal("expected at least one match")
	}

	found := false
	for _, m := range matches {
		if m.ID == f.MatchID {
			found = true
			break
		}
	}
	if !found {
		t.Error("seeded match not found in team list")
	}
}

func TestPGRepository_UpdateMatchSchedule(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	newTime := "20:00:00"
	newField := 2
	req := UpdateMatchScheduleRequest{
		MatchTime:   &newTime,
		FieldNumber: &newField,
	}

	updated, err := repo.UpdateMatchSchedule(ctx, f.MatchID, req)
	if err != nil {
		t.Fatalf("UpdateMatchSchedule: %v", err)
	}

	if updated.MatchTime == nil {
		t.Errorf("match_time: got nil, want %q", newTime)
	} else if *updated.MatchTime != newTime && !stringContains(*updated.MatchTime, newTime) {
		// Allow for minor formatting differences (e.g., microseconds)
		t.Errorf("match_time: got %q, want %q", *updated.MatchTime, newTime)
	}
	if updated.FieldNumber == nil || *updated.FieldNumber != newField {
		t.Errorf("field_number: got %v, want %d", updated.FieldNumber, newField)
	}
}

func stringContains(s, substr string) bool {
	for i := 0; i < len(s); i++ {
		if i+len(substr) <= len(s) && s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

func TestPGRepository_CreateGoal(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := PostGoalRequest{
		PlayerID: f.HomePlayerID,
		TeamID:   f.HomeTeamID,
		Minute:   45,
		GoalType: stringPtr("normal"),
	}

	goal, err := repo.CreateGoal(ctx, f.MatchID, req)
	if err != nil {
		t.Fatalf("CreateGoal: %v", err)
	}

	if goal.PlayerID != f.HomePlayerID {
		t.Errorf("player_id: got %v, want %v", goal.PlayerID, f.HomePlayerID)
	}
	if goal.Minute != 45 {
		t.Errorf("minute: got %d, want 45", goal.Minute)
	}
}

func TestPGRepository_CreateCard(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	req := PostCardRequest{
		PlayerID: f.HomePlayerID,
		TeamID:   f.HomeTeamID,
		CardType: "yellow",
		Minute:   30,
	}

	card, err := repo.CreateCard(ctx, f.MatchID, req)
	if err != nil {
		t.Fatalf("CreateCard: %v", err)
	}

	if card.CardType != CardTypeYellow {
		t.Errorf("card_type: got %v, want %v", card.CardType, CardTypeYellow)
	}
	if card.Minute != 30 {
		t.Errorf("minute: got %d, want 30", card.Minute)
	}
}

func TestPGRepository_PostMatchResult(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	err := repo.PostMatchResult(ctx, f.MatchID, 3, 2)
	if err != nil {
		t.Fatalf("PostMatchResult: %v", err)
	}

	updated, err := repo.GetMatchByID(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}

	if updated.HomeScore != 3 || updated.AwayScore != 2 {
		t.Errorf("score: got %d-%d, want 3-2", updated.HomeScore, updated.AwayScore)
	}
	if updated.Status != MatchStatusFinished {
		t.Errorf("status: got %v, want %v", updated.Status, MatchStatusFinished)
	}
}

func TestPGRepository_CreateRefereeReport(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	refName := "Test Referee"
	req := PostRefereeReportRequest{
		RefereeName: &refName,
	}

	report, err := repo.CreateOrUpdateRefereeReport(ctx, f.MatchID, req)
	if err != nil {
		t.Fatalf("CreateOrUpdateRefereeReport: %v", err)
	}

	if report.RefereeName == nil || *report.RefereeName != refName {
		t.Errorf("referee_name: got %v, want %s", report.RefereeName, refName)
	}
}

func TestPGRepository_GetRefereeReport(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create first
	refName := "Test Referee"
	_, err := repo.CreateOrUpdateRefereeReport(ctx, f.MatchID, PostRefereeReportRequest{
		RefereeName: &refName,
	})
	if err != nil {
		t.Fatalf("CreateOrUpdateRefereeReport: %v", err)
	}

	// Retrieve
	report, err := repo.GetRefereeReport(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetRefereeReport: %v", err)
	}

	if report.RefereeName == nil || *report.RefereeName != refName {
		t.Errorf("referee_name: got %v, want %s", report.RefereeName, refName)
	}
}

func TestPGRepository_GetMatchWithRelations(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create a goal first
	goalReq := PostGoalRequest{
		PlayerID: f.HomePlayerID,
		TeamID:   f.HomeTeamID,
		Minute:   30,
	}
	_, err := repo.CreateGoal(ctx, f.MatchID, goalReq)
	if err != nil {
		t.Fatalf("CreateGoal: %v", err)
	}

	// Get with relations
	mwr, err := repo.GetMatchWithRelations(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchWithRelations: %v", err)
	}

	if len(mwr.Goals) == 0 {
		t.Fatal("expected goals in match relations")
	}
	if mwr.Goals[0].Minute != 30 {
		t.Errorf("goal minute: got %d, want 30", mwr.Goals[0].Minute)
	}
}

func TestPGRepository_DeleteMatch(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create a new match to delete (seeded one has scores)
	req := CreateMatchRequest{
		TournamentID: f.TournamentID,
		HomeTeamID:   f.HomeTeamID,
		AwayTeamID:   f.AwayTeamID,
		MatchDate:    time.Now().Add(48 * time.Hour),
	}
	m, err := repo.CreateMatch(ctx, req)
	if err != nil {
		t.Fatalf("CreateMatch: %v", err)
	}

	// Delete it
	err = repo.DeleteMatch(ctx, m.ID)
	if err != nil {
		t.Fatalf("DeleteMatch: %v", err)
	}

	// Verify it's gone
	_, err = repo.GetMatchByID(ctx, m.ID)
	if err != httpx.ErrNotFound {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}

func stringPtr(s string) *string {
	return &s
}

func TestPGRepository_PublishMatch(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Verify match starts unpublished
	m, err := repo.GetMatchByID(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}
	if m.IsPublished {
		t.Fatal("match should start unpublished")
	}

	// Publish it
	err = repo.PublishMatch(ctx, f.MatchID, true)
	if err != nil {
		t.Fatalf("PublishMatch: %v", err)
	}

	// Verify it's published
	m, err = repo.GetMatchByID(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}
	if !m.IsPublished {
		t.Fatal("match should be published")
	}

	// Unpublish it
	err = repo.PublishMatch(ctx, f.MatchID, false)
	if err != nil {
		t.Fatalf("PublishMatch: %v", err)
	}

	// Verify it's unpublished
	m, err = repo.GetMatchByID(ctx, f.MatchID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}
	if m.IsPublished {
		t.Fatal("match should be unpublished")
	}
}

func TestPGRepository_PublishRound(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create a few matches in the same round using existing teams
	round := 1
	req := CreateMatchRequest{
		TournamentID: f.TournamentID,
		HomeTeamID:   f.HomeTeamID,
		AwayTeamID:   f.AwayTeamID,
		MatchDate:    time.Now().Add(24 * time.Hour),
		Round:        &round,
	}
	_, err := repo.CreateMatch(ctx, req)
	if err != nil {
		t.Fatalf("CreateMatch: %v", err)
	}

	// Publish all matches in round 1
	err = repo.PublishRound(ctx, f.TournamentID, round, true)
	if err != nil {
		t.Fatalf("PublishRound: %v", err)
	}

	// Verify all round 1 matches are published
	matches, err := repo.ListMatchesByTournament(ctx, f.TournamentID, ListMatchesFilter{Limit: 100})
	if err != nil {
		t.Fatalf("ListMatchesByTournament: %v", err)
	}

	foundPublished := false
	for _, m := range matches {
		if m.Round != nil && *m.Round == round {
			if !m.IsPublished {
				t.Errorf("match in round %d should be published", round)
			}
			foundPublished = true
		}
	}
	if !foundPublished {
		t.Error("no published matches found in round 1")
	}
}

func TestPGRepository_GetTournamentStandings(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Manually create team_stats for the seeded teams
	// The seeded match is 2-1, so home team should have 3 points and away team 0
	_, err := pool.Exec(ctx, `
		INSERT INTO public.team_stats (team_id, tournament_id, league_id, matches_played, matches_won, matches_drawn, matches_lost, goals_for, goals_against)
		VALUES ($1, $2, $3, 1, 1, 0, 0, 2, 1)
	`, f.HomeTeamID, f.TournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert home team stats: %v", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO public.team_stats (team_id, tournament_id, league_id, matches_played, matches_won, matches_drawn, matches_lost, goals_for, goals_against)
		VALUES ($1, $2, $3, 1, 0, 0, 1, 1, 2)
	`, f.AwayTeamID, f.TournamentID, f.LeagueID)
	if err != nil {
		t.Fatalf("insert away team stats: %v", err)
	}

	// Get standings
	standings, err := repo.GetTournamentStandings(ctx, f.TournamentID)
	if err != nil {
		t.Fatalf("GetTournamentStandings: %v", err)
	}

	if len(standings) < 2 {
		t.Fatal("expected at least 2 teams in standings")
	}

	// Find home and away teams
	var homeTeamStanding, awayTeamStanding *StandingsTeam
	for i := range standings {
		if standings[i].TeamID == f.HomeTeamID {
			homeTeamStanding = &standings[i]
		}
		if standings[i].TeamID == f.AwayTeamID {
			awayTeamStanding = &standings[i]
		}
	}

	if homeTeamStanding == nil || awayTeamStanding == nil {
		t.Fatal("both home and away teams should be in standings")
	}

	// Home team won 2-1, so should have 3 points (1 win * 3)
	if homeTeamStanding.Points != 3 {
		t.Errorf("home team points: got %d, want 3", homeTeamStanding.Points)
	}

	// Away team lost, so should have 0 points
	if awayTeamStanding.Points != 0 {
		t.Errorf("away team points: got %d, want 0", awayTeamStanding.Points)
	}

	// Home team should be first in standings (3 points > 0 points)
	if standings[0].TeamID != f.HomeTeamID {
		t.Errorf("home team should be first in standings")
	}
}

func TestPostResult_Idempotency(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)
	ctx := context.Background()

	// Create a new match
	req := CreateMatchRequest{
		TournamentID: f.TournamentID,
		HomeTeamID:   f.HomeTeamID,
		AwayTeamID:   f.AwayTeamID,
		MatchDate:    time.Now().Add(48 * time.Hour),
	}
	m, err := repo.CreateMatch(ctx, req)
	if err != nil {
		t.Fatalf("CreateMatch: %v", err)
	}

	// Get a player for the goal
	playerReq := PostGoalRequest{
		PlayerID: f.HomePlayerID,
		TeamID:   f.HomeTeamID,
		Minute:   45,
	}
	redCardReq := PostCardRequest{
		PlayerID: f.HomePlayerID,
		TeamID:   f.HomeTeamID,
		CardType: string(CardTypeRed),
		Minute:   70,
	}

	// Post result with one goal and one red card
	resultReq1 := PostMatchResultRequest{
		HomeScore: 1,
		AwayScore: 0,
		Goals:     []PostGoalRequest{playerReq},
		Cards:     []PostCardRequest{redCardReq},
	}

	// First post
	err = repo.PostMatchResult(ctx, m.ID, resultReq1.HomeScore, resultReq1.AwayScore)
	if err != nil {
		t.Fatalf("PostMatchResult (1st): %v", err)
	}

	// Create goal and card for first post
	_, _ = repo.CreateGoal(ctx, m.ID, playerReq)
	_, _ = repo.CreateCard(ctx, m.ID, redCardReq)

	// Second post with same values (idempotency)
	// In real flow, caller would delete and recreate, but repo just updates score
	err = repo.PostMatchResult(ctx, m.ID, resultReq1.HomeScore, resultReq1.AwayScore)
	if err != nil {
		t.Fatalf("PostMatchResult (2nd): %v", err)
	}

	// Verify final state
	updated, err := repo.GetMatchByID(ctx, m.ID)
	if err != nil {
		t.Fatalf("GetMatchByID: %v", err)
	}

	if updated.HomeScore != 1 || updated.AwayScore != 0 {
		t.Errorf("score: got %d-%d, want 1-0", updated.HomeScore, updated.AwayScore)
	}
	if updated.Status != MatchStatusFinished {
		t.Errorf("status: got %v, want %v", updated.Status, MatchStatusFinished)
	}
}
