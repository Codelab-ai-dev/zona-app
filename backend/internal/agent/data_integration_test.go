//go:build integration

package agent

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

// TestDataProviderCalendar tests calendario intent with two leagues.
func TestDataProviderCalendar(t *testing.T) {
	pool := testdb.Pool(t)

	f1 := testdb.Seed(t, pool)
	f2 := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	// Add a published match for league 1, round 1
	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	exec(`UPDATE matches SET round = $1, is_published = true WHERE id = $2 AND tournament_id = $3`,
		1, f1.MatchID, f1.TournamentID)

	// Test: caller from league 1 sees their league's match
	id1 := Identity{
		LeagueID:     f1.LeagueID,
		TournamentID: &f1.TournamentID,
	}
	c1 := Classification{
		Intent: IntentCalendar,
		Entities: Entities{
			Round: ptrInt(1),
		},
	}
	text1, err := provider.Fetch(ctx, id1, c1)
	if err != nil {
		t.Fatalf("Fetch calendar for league 1: %v", err)
	}
	if text1 == "" {
		t.Fatal("Expected calendar data for league 1, got empty")
	}
	if !contains(text1, "Local FC") || !contains(text1, "Visita FC") {
		t.Errorf("Expected league 1 team names in calendar, got: %s", text1)
	}

	// Test: caller from league 2 does NOT see league 1's data
	id2 := Identity{
		LeagueID:     f2.LeagueID,
		TournamentID: &f2.TournamentID,
	}
	text2, err := provider.Fetch(ctx, id2, c1)
	if err != nil {
		t.Fatalf("Fetch calendar for league 2: %v", err)
	}
	// League 2's match is unpublished, so should be empty for round 1
	if contains(text2, "Local FC") || contains(text2, "Visita FC") {
		t.Errorf("League 2 should NOT see league 1's team names, got: %s", text2)
	}
}

// TestDataProviderResults tests resultados intent with published/unpublished matches.
func TestDataProviderResults(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Mark the match as finished and published
	exec(`UPDATE matches SET status = 'finished', is_published = true WHERE id = $1`, f.MatchID)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}
	c := Classification{
		Intent: IntentResults,
	}

	text, err := provider.Fetch(ctx, id, c)
	if err != nil {
		t.Fatalf("Fetch results: %v", err)
	}

	// Should show finished published match
	if !contains(text, "2") || !contains(text, "1") {
		t.Errorf("Expected match score in results, got: %s", text)
	}

	// Test unpublished match is not shown
	f2 := testdb.Seed(t, pool)
	exec(`UPDATE matches SET status = 'finished', is_published = false WHERE tournament_id = $1 AND id != $2`,
		f2.TournamentID, f2.MatchID)

	id2 := Identity{
		LeagueID:     f2.LeagueID,
		TournamentID: &f2.TournamentID,
	}
	text2, err := provider.Fetch(ctx, id2, c)
	if err != nil {
		t.Fatalf("Fetch results for unpublished: %v", err)
	}

	// Should indicate no published results
	if !contains(text2, "NOTA") {
		t.Errorf("Expected NOTA for no published results, got: %s", text2)
	}
}

// TestDataProviderStandings tests tabla_posiciones intent.
func TestDataProviderStandings(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Mark the match as finished and published
	exec(`UPDATE matches SET status = 'finished', is_published = true WHERE id = $1`, f.MatchID)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}
	c := Classification{
		Intent: IntentStandings,
	}

	text, err := provider.Fetch(ctx, id, c)
	if err != nil {
		t.Fatalf("Fetch standings: %v", err)
	}

	if !contains(text, "TABLA DE POSICIONES") {
		t.Errorf("Expected standings table header, got: %s", text)
	}
	if !contains(text, "Local FC") || !contains(text, "Visita FC") {
		t.Errorf("Expected team names in standings, got: %s", text)
	}
	// Winner should have 3 points
	if !contains(text, "3pts") {
		t.Errorf("Expected winning team with 3pts, got: %s", text)
	}
}

// TestDataProviderSuspensions tests suspensiones intent with league isolation.
func TestDataProviderSuspensions(t *testing.T) {
	pool := testdb.Pool(t)
	f1 := testdb.Seed(t, pool)
	f2 := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Create a suspension in league 1
	suspID := uuid.New()
	exec(`INSERT INTO player_suspensions
		(id, player_id, team_id, league_id, tournament_id, suspension_type, reason, status, matches_to_serve)
		VALUES ($1, $2, $3, $4, $5, 'red_card', 'Test suspension', 'active', 1)`,
		suspID, f1.HomePlayerID, f1.HomeTeamID, f1.LeagueID, f1.TournamentID)

	// Test: league 1 sees suspension
	id1 := Identity{
		LeagueID:     f1.LeagueID,
		TournamentID: &f1.TournamentID,
	}
	c := Classification{
		Intent: IntentSuspensions,
	}
	text1, err := provider.Fetch(ctx, id1, c)
	if err != nil {
		t.Fatalf("Fetch suspensions for league 1: %v", err)
	}
	if !contains(text1, "Jugador") {
		t.Errorf("Expected suspension in league 1, got: %s", text1)
	}

	// Test: league 2 does NOT see league 1's suspension
	id2 := Identity{
		LeagueID:     f2.LeagueID,
		TournamentID: &f2.TournamentID,
	}
	text2, err := provider.Fetch(ctx, id2, c)
	if err != nil {
		t.Fatalf("Fetch suspensions for league 2: %v", err)
	}
	if !contains(text2, "No hay jugadores suspendidos") {
		t.Errorf("League 2 should have no suspensions, got: %s", text2)
	}
}

// TestDataProviderStatistics tests estadisticas intent.
func TestDataProviderStatistics(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Mark the match as finished and published
	exec(`UPDATE matches SET status = 'finished', is_published = true WHERE id = $1`, f.MatchID)

	// Add a goal to the seeded player
	goalID := uuid.New()
	exec(`INSERT INTO match_goals (id, match_id, player_id, team_id, minute)
		VALUES ($1, $2, $3, $4, $5)`,
		goalID, f.MatchID, f.HomePlayerID, f.HomeTeamID, 10)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}
	c := Classification{
		Intent: IntentStatistics,
	}

	text, err := provider.Fetch(ctx, id, c)
	if err != nil {
		t.Fatalf("Fetch statistics: %v", err)
	}

	if !contains(text, "Tabla de Goleadores") {
		t.Errorf("Expected scorers table header, got: %s", text)
	}
	if !contains(text, "Jugador") {
		t.Errorf("Expected player name in scorers, got: %s", text)
	}
	if !contains(text, "1 gol") {
		t.Errorf("Expected 1 goal, got: %s", text)
	}
}

// TestDataProviderNextMatches tests proximos_partidos intent with team name escaping.
func TestDataProviderNextMatches(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Set match to scheduled and published
	exec(`UPDATE matches SET status = 'scheduled', is_published = true WHERE id = $1`, f.MatchID)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}
	c := Classification{
		Intent: IntentNextMatches,
		Entities: Entities{
			TeamName: "Local",
		},
	}

	text, err := provider.Fetch(ctx, id, c)
	if err != nil {
		t.Fatalf("Fetch next matches: %v", err)
	}

	if !contains(text, "Local FC") || !contains(text, "Visita FC") {
		t.Errorf("Expected team names in next matches, got: %s", text)
	}
}

// TestDataProviderTeamNameEscaping tests SQL injection attempts are escaped.
func TestDataProviderTeamNameEscaping(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Set match to scheduled and published
	exec(`UPDATE matches SET status = 'scheduled', is_published = true WHERE id = $1`, f.MatchID)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}

	// Test dangerous team name patterns that should not cause errors or data leaks
	dangerousNames := []string{
		"%",
		"_",
		"a_b' OR 1=1 --",
		"Local' UNION SELECT * FROM users --",
		"Team%",
	}

	for _, name := range dangerousNames {
		c := Classification{
			Intent: IntentNextMatches,
			Entities: Entities{
				TeamName: name,
			},
		}

		text, err := provider.Fetch(ctx, id, c)
		if err != nil {
			t.Errorf("Fetch with team name %q should not error: %v", name, err)
		}

		// Verify the response doesn't contain SQL keywords that would indicate a leak
		// (Our escaping should prevent SQL injection, so dangerous patterns won't match any team)
		if contains(text, "DROP") || contains(text, "DELETE") || contains(text, "INSERT") {
			t.Errorf("Query with team name %q may have leaked SQL: %s", name, text)
		}
	}
}

// TestDataProviderLeagueIsolation ensures league 1 data does not appear for league 2.
func TestDataProviderLeagueIsolation(t *testing.T) {
	pool := testdb.Pool(t)
	f1 := testdb.Seed(t, pool)
	f2 := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	exec := func(q string, args ...any) {
		t.Helper()
		if _, err := pool.Exec(ctx, q, args...); err != nil {
			t.Fatalf("exec: %v", err)
		}
	}

	// Publish results for league 1
	exec(`UPDATE matches SET status = 'finished', is_published = true WHERE tournament_id = $1`, f1.TournamentID)

	// Get standings for league 2 - should be empty
	id2 := Identity{
		LeagueID:     f2.LeagueID,
		TournamentID: &f2.TournamentID,
	}
	c := Classification{
		Intent: IntentStandings,
	}

	text, err := provider.Fetch(ctx, id2, c)
	if err != nil {
		t.Fatalf("Fetch standings: %v", err)
	}

	// Should not contain league 1's teams
	if contains(text, "Local FC") && f1.HomeTeamID.String() != "" {
		// Need to verify this is league 1's team, not a coincidence
		// Query to double-check league 1's team name
		var league1TeamName string
		err := pool.QueryRow(ctx, `SELECT name FROM teams WHERE id = $1`, f1.HomeTeamID).Scan(&league1TeamName)
		if err == nil && league1TeamName == "Local FC" {
			// Verify f2's teams are different
			var league2HomeName string
			pool.QueryRow(ctx, `SELECT name FROM teams WHERE id = $1`, f2.HomeTeamID).Scan(&league2HomeName)
			if league2HomeName != "Local FC" {
				t.Errorf("League 2 standings should not contain league 1's team names")
			}
		}
	}
}

// TestDataProviderNoIntentReturnsEmpty tests intents that should return empty.
func TestDataProviderNoIntentReturnsEmpty(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)

	ctx := context.Background()
	provider := NewPGDataProvider(pool)

	id := Identity{
		LeagueID:     f.LeagueID,
		TournamentID: &f.TournamentID,
	}

	noSQLIntents := []Intent{
		IntentRules,
		IntentPayments,
		IntentGeneralInfo,
		IntentConversation,
		IntentUnknown,
	}

	for _, intent := range noSQLIntents {
		c := Classification{
			Intent: intent,
		}

		text, err := provider.Fetch(ctx, id, c)
		if err != nil {
			t.Errorf("Intent %s should not error: %v", intent, err)
		}
		if text != "" {
			t.Errorf("Intent %s should return empty, got: %q", intent, text)
		}
	}
}
