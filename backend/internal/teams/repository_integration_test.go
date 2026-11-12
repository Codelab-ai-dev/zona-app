//go:build integration

package teams

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestRepository_Teams_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	repo := NewPGRepository(pool)

	// Test GetTeamByID
	team, err := repo.GetTeamByID(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("GetTeamByID failed: %v", err)
	}
	if team.ID != f.HomeTeamID {
		t.Errorf("expected team ID %s, got %s", f.HomeTeamID, team.ID)
	}
	if team.Name != "Local FC" {
		t.Errorf("expected team name 'Local FC', got %s", team.Name)
	}

	// Test GetTeamsByLeague
	teams, err := repo.GetTeamsByLeague(ctx, f.LeagueID, 100, 0)
	if err != nil {
		t.Fatalf("GetTeamsByLeague failed: %v", err)
	}
	if len(teams) < 2 {
		t.Errorf("expected at least 2 teams, got %d", len(teams))
	}

	// Test GetTeamsByOwner
	ownerTeams, err := repo.GetTeamsByOwner(ctx, f.TeamOwnerID, 100, 0)
	if err != nil {
		t.Fatalf("GetTeamsByOwner failed: %v", err)
	}
	if len(ownerTeams) < 2 {
		t.Errorf("expected at least 2 teams owned, got %d", len(ownerTeams))
	}

	// Test UpdateTeam
	newName := "Updated FC"
	updatedTeam, err := repo.UpdateTeam(ctx, f.HomeTeamID, UpdateTeamRequest{
		Name: &newName,
	})
	if err != nil {
		t.Fatalf("UpdateTeam failed: %v", err)
	}
	if updatedTeam.Name != newName {
		t.Errorf("expected team name '%s', got %s", newName, updatedTeam.Name)
	}

	// Test DeactivateTeam
	inactiveTeam, err := repo.DeactivateTeam(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("DeactivateTeam failed: %v", err)
	}
	if inactiveTeam.IsActive {
		t.Errorf("expected team to be inactive")
	}

	// Test ActivateTeam
	activeTeam, err := repo.ActivateTeam(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("ActivateTeam failed: %v", err)
	}
	if !activeTeam.IsActive {
		t.Errorf("expected team to be active")
	}
}

func TestRepository_Players_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	repo := NewPGRepository(pool)

	// Test GetPlayerByID
	player, err := repo.GetPlayerByID(ctx, f.HomePlayerID)
	if err != nil {
		t.Fatalf("GetPlayerByID failed: %v", err)
	}
	if player.ID != f.HomePlayerID {
		t.Errorf("expected player ID %s, got %s", f.HomePlayerID, player.ID)
	}
	if player.Name != "Jugador" {
		t.Errorf("expected player name 'Jugador', got %s", player.Name)
	}

	// Test GetPlayersByTeam
	players, err := repo.GetPlayersByTeam(ctx, f.HomeTeamID, 100, 0)
	if err != nil {
		t.Fatalf("GetPlayersByTeam failed: %v", err)
	}
	if len(players) < 1 {
		t.Errorf("expected at least 1 player, got %d", len(players))
	}

	// Test CreatePlayer
	newPlayer := Player{
		ID:           uuid.New(),
		Name:         "New Player",
		TeamID:       f.HomeTeamID,
		Position:     "Goalkeeper",
		JerseyNumber: 1,
		IsActive:     true,
	}
	createdPlayer, err := repo.CreatePlayer(ctx, newPlayer)
	if err != nil {
		t.Fatalf("CreatePlayer failed: %v", err)
	}
	if createdPlayer.Name != "New Player" {
		t.Errorf("expected player name 'New Player', got %s", createdPlayer.Name)
	}

	// Test UpdatePlayer
	newName := "Updated Player"
	updatedPlayer, err := repo.UpdatePlayer(ctx, createdPlayer.ID, UpdatePlayerRequest{
		Name: &newName,
	})
	if err != nil {
		t.Fatalf("UpdatePlayer failed: %v", err)
	}
	if updatedPlayer.Name != newName {
		t.Errorf("expected player name '%s', got %s", newName, updatedPlayer.Name)
	}

	// Test DeactivatePlayer
	inactivePlayer, err := repo.DeactivatePlayer(ctx, createdPlayer.ID)
	if err != nil {
		t.Fatalf("DeactivatePlayer failed: %v", err)
	}
	if inactivePlayer.IsActive {
		t.Errorf("expected player to be inactive")
	}

	// Test CountPlayersByTeam
	count, err := repo.CountPlayersByTeam(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("CountPlayersByTeam failed: %v", err)
	}
	if count < 1 {
		t.Errorf("expected at least 1 player count, got %d", count)
	}
}

func TestRepository_CoachingStaff_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	repo := NewPGRepository(pool)

	// Test CreateCoachingStaff
	staffID := uuid.New()
	staff := CoachingStaff{
		ID:       staffID,
		TeamID:   f.HomeTeamID,
		Name:     "Test Coach",
		Role:     "Head Coach",
		IsActive: true,
	}
	createdStaff, err := repo.CreateCoachingStaff(ctx, staff)
	if err != nil {
		t.Fatalf("CreateCoachingStaff failed: %v", err)
	}
	if createdStaff.Name != "Test Coach" {
		t.Errorf("expected staff name 'Test Coach', got %s", createdStaff.Name)
	}

	// Test GetCoachingStaffByID
	retrievedStaff, err := repo.GetCoachingStaffByID(ctx, staffID)
	if err != nil {
		t.Fatalf("GetCoachingStaffByID failed: %v", err)
	}
	if retrievedStaff.ID != staffID {
		t.Errorf("expected staff ID %s, got %s", staffID, retrievedStaff.ID)
	}

	// Test GetCoachingStaffByTeam
	teamStaff, err := repo.GetCoachingStaffByTeam(ctx, f.HomeTeamID, 100, 0)
	if err != nil {
		t.Fatalf("GetCoachingStaffByTeam failed: %v", err)
	}
	if len(teamStaff) < 1 {
		t.Errorf("expected at least 1 coaching staff, got %d", len(teamStaff))
	}

	// Test UpdateCoachingStaff
	newRole := "Assistant Coach"
	updatedStaff, err := repo.UpdateCoachingStaff(ctx, staffID, UpdateCoachingStaffRequest{
		Role: &newRole,
	})
	if err != nil {
		t.Fatalf("UpdateCoachingStaff failed: %v", err)
	}
	if updatedStaff.Role != newRole {
		t.Errorf("expected role '%s', got %s", newRole, updatedStaff.Role)
	}

	// Test CountCoachingStaffByTeam (before deactivation)
	count, err := repo.CountCoachingStaffByTeam(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("CountCoachingStaffByTeam failed: %v", err)
	}
	if count < 1 {
		t.Errorf("expected at least 1 coaching staff count, got %d", count)
	}

	// Test DeactivateCoachingStaff
	inactiveStaff, err := repo.DeactivateCoachingStaff(ctx, staffID)
	if err != nil {
		t.Fatalf("DeactivateCoachingStaff failed: %v", err)
	}
	if inactiveStaff.IsActive {
		t.Errorf("expected staff to be inactive")
	}

	// Verify count decreased after deactivation
	countAfter, err := repo.CountCoachingStaffByTeam(ctx, f.HomeTeamID)
	if err != nil {
		t.Fatalf("CountCoachingStaffByTeam after deactivation failed: %v", err)
	}
	if countAfter != count-1 {
		t.Errorf("expected count to decrease by 1, got %d before and %d after", count, countAfter)
	}
}

func TestRepository_PlayerRegistrationRequests_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	f := testdb.Seed(t, pool)
	ctx := context.Background()
	repo := NewPGRepository(pool)

	// Test CreatePlayerRegistrationRequest
	reqID := uuid.New()
	birthDate := httpx.NewDate(time.Now().AddDate(-20, 0, 0))
	registrationReq := PlayerRegistrationRequest{
		ID:             reqID,
		TeamID:         f.HomeTeamID,
		TournamentID:   f.TournamentID,
		PlayerName:     "Registration Player",
		PlayerPosition: "Midfielder",
		JerseyNumber:   7,
		BirthDate:      &birthDate,
		Reason:         "Player transfer request",
		Status:         "pending",
		RequestedBy:    f.TeamOwnerID,
	}
	createdReq, err := repo.CreatePlayerRegistrationRequest(ctx, registrationReq)
	if err != nil {
		t.Fatalf("CreatePlayerRegistrationRequest failed: %v", err)
	}
	if createdReq.Status != "pending" {
		t.Errorf("expected status 'pending', got %s", createdReq.Status)
	}

	// Test GetPlayerRegistrationRequestByID
	retrievedReq, err := repo.GetPlayerRegistrationRequestByID(ctx, reqID)
	if err != nil {
		t.Fatalf("GetPlayerRegistrationRequestByID failed: %v", err)
	}
	if retrievedReq.ID != reqID {
		t.Errorf("expected request ID %s, got %s", reqID, retrievedReq.ID)
	}

	// Test GetPlayerRegistrationRequestsByTeam
	teamReqs, err := repo.GetPlayerRegistrationRequestsByTeam(ctx, f.HomeTeamID, 100, 0)
	if err != nil {
		t.Fatalf("GetPlayerRegistrationRequestsByTeam failed: %v", err)
	}
	if len(teamReqs) < 1 {
		t.Errorf("expected at least 1 request, got %d", len(teamReqs))
	}

	// Test GetPlayerRegistrationRequestsByTournament
	tournamentReqs, err := repo.GetPlayerRegistrationRequestsByTournament(ctx, f.TournamentID, "pending", 100, 0)
	if err != nil {
		t.Fatalf("GetPlayerRegistrationRequestsByTournament failed: %v", err)
	}
	if len(tournamentReqs) < 1 {
		t.Errorf("expected at least 1 pending request, got %d", len(tournamentReqs))
	}

	// Test ReviewPlayerRegistrationRequest
	notes := "Approved"
	reviewedReq, err := repo.ReviewPlayerRegistrationRequest(ctx, reqID, "approved", f.LeagueAdminID, &notes)
	if err != nil {
		t.Fatalf("ReviewPlayerRegistrationRequest failed: %v", err)
	}
	if reviewedReq.Status != "approved" {
		t.Errorf("expected status 'approved', got %s", reviewedReq.Status)
	}
	if reviewedReq.ReviewedBy == nil || *reviewedReq.ReviewedBy != f.LeagueAdminID {
		t.Errorf("expected reviewed_by to be set to league admin")
	}
}
