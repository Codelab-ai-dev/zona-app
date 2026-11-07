//go:build integration

package directory

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/testdb"
)

func TestListUsers_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	_ = testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	users, err := repo.ListUsers(context.Background(), nil, nil, "", 50, 0)
	if err != nil {
		t.Fatalf("ListUsers: %v", err)
	}

	if len(users) < 2 {
		t.Errorf("expected at least 2 users, got %d", len(users))
	}
}

func TestListLeagueUsers_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	users, err := repo.ListLeagueUsers(context.Background(), fix.LeagueID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListLeagueUsers: %v", err)
	}

	if len(users) == 0 {
		t.Error("expected at least 1 user in league")
	}
}

func TestListLeagueUsers_WithSearch_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	users, err := repo.ListLeagueUsers(context.Background(), fix.LeagueID, "Test", 50, 0)
	if err != nil {
		t.Fatalf("ListLeagueUsers: %v", err)
	}

	if len(users) == 0 {
		t.Error("expected to find user with search")
	}
}

func TestCreateWhatsAppLink_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0001", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		UserID:            &fix.LeagueAdminID,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	link, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	if link.PhoneNumber != phone {
		t.Errorf("PhoneNumber mismatch: got %v, want %v", link.PhoneNumber, phone)
	}
	if link.LeagueID != fix.LeagueID {
		t.Errorf("LeagueID mismatch: got %v, want %v", link.LeagueID, fix.LeagueID)
	}
}

func TestCreateWhatsAppLink_Duplicate_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0002", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	// First create should succeed
	_, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("first CreateWhatsAppLink: %v", err)
	}

	// Second create with same phone should fail
	_, err = repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err == nil {
		t.Fatal("expected conflict error on duplicate phone number, got nil")
	}
}

func TestListWhatsAppLinks_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	// Create a link first
	phone := fmt.Sprintf("555%s0003", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}
	_, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	// List links
	links, err := repo.ListWhatsAppLinks(context.Background(), fix.LeagueID, 50, 0)
	if err != nil {
		t.Fatalf("ListWhatsAppLinks: %v", err)
	}

	if len(links) == 0 {
		t.Error("expected at least 1 link")
	}
}

func TestGetWhatsAppLink_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0004", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	created, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	link, err := repo.GetWhatsAppLink(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("GetWhatsAppLink: %v", err)
	}

	if link.PhoneNumber != phone {
		t.Errorf("PhoneNumber mismatch: got %v, want %v", link.PhoneNumber, phone)
	}
}

func TestGetWhatsAppLink_NotFound_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	_, err := repo.GetWhatsAppLink(context.Background(), uuid.New())
	if err == nil {
		t.Fatal("expected not found error, got nil")
	}
}

func TestUpdateWhatsAppLink_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0005", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	created, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	// Update the link
	updateReq := &UpdateWhatsAppLinkRequest{
		IsActive: func() *bool { v := false; return &v }(),
	}

	updated, err := repo.UpdateWhatsAppLink(context.Background(), created.ID, updateReq)
	if err != nil {
		t.Fatalf("UpdateWhatsAppLink: %v", err)
	}

	if updated.IsActive {
		t.Error("expected IsActive to be false")
	}
}

func TestDeactivateWhatsAppLink_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0006", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	created, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	deactivated, err := repo.DeactivateWhatsAppLink(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("DeactivateWhatsAppLink: %v", err)
	}

	if deactivated.IsActive {
		t.Error("expected IsActive to be false")
	}
}

func TestPhoneNumberExists_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0007", uuid.New().String()[:8])
	// Create a link
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}
	_, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	// Check it exists
	exists, err := repo.PhoneNumberExists(context.Background(), phone)
	if err != nil {
		t.Fatalf("PhoneNumberExists: %v", err)
	}

	if !exists {
		t.Error("expected phone number to exist")
	}

	// Check non-existent
	exists, err = repo.PhoneNumberExists(context.Background(), "9999999999")
	if err != nil {
		t.Fatalf("PhoneNumberExists: %v", err)
	}

	if exists {
		t.Error("expected phone number to not exist")
	}
}

func TestGetLeagueID_Integration(t *testing.T) {
	pool := testdb.Pool(t)
	fix := testdb.Seed(t, pool)
	repo := NewPGRepository(pool)

	phone := fmt.Sprintf("555%s0008", uuid.New().String()[:8])
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       phone,
		Role:              "league_admin",
		PreferredLanguage: "es",
	}

	created, err := repo.CreateWhatsAppLink(context.Background(), fix.LeagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	leagueID, err := repo.GetLeagueID(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("GetLeagueID: %v", err)
	}

	if leagueID != fix.LeagueID {
		t.Errorf("LeagueID mismatch: got %v, want %v", leagueID, fix.LeagueID)
	}
}
