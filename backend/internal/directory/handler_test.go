package directory

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeRepository implements Repository for testing.
type fakeRepository struct {
	mu            sync.Mutex
	users         map[uuid.UUID]User
	whatsappLinks map[uuid.UUID]WhatsAppLink
	phoneNumbers  map[string]bool
	leagueUsers   map[uuid.UUID][]User
	adminLeagues  map[uuid.UUID][]uuid.UUID
}

func (f *fakeRepository) ListUsers(ctx context.Context, role *string, leagueID *uuid.UUID, search string, limit, offset int) ([]User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	var users []User
	for _, u := range f.users {
		if role != nil && u.Role != *role {
			continue
		}
		if leagueID != nil && (u.LeagueID == nil || *u.LeagueID != *leagueID) {
			continue
		}
		users = append(users, u)
	}
	return users, nil
}

func (f *fakeRepository) ListLeagueUsers(ctx context.Context, leagueIDs []uuid.UUID, role *string, search string, limit, offset int) ([]User, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	users := []User{}
	for _, id := range leagueIDs {
		for _, u := range f.leagueUsers[id] {
			if role == nil || u.Role == *role {
				users = append(users, u)
			}
		}
	}
	return users, nil
}

func (f *fakeRepository) AdminLeagueIDs(ctx context.Context, adminID uuid.UUID) ([]uuid.UUID, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.adminLeagues[adminID], nil
}

func (f *fakeRepository) ListWhatsAppLinks(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]WhatsAppLink, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	var links []WhatsAppLink
	for _, l := range f.whatsappLinks {
		if l.LeagueID == leagueID {
			links = append(links, l)
		}
	}
	return links, nil
}

func (f *fakeRepository) CreateWhatsAppLink(ctx context.Context, leagueID uuid.UUID, req *CreateWhatsAppLinkRequest) (WhatsAppLink, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.phoneNumbers[req.PhoneNumber] {
		return WhatsAppLink{}, httpx.ErrConflict.Wrap(nil)
	}

	link := WhatsAppLink{
		ID:                uuid.New(),
		PhoneNumber:       req.PhoneNumber,
		UserID:            req.UserID,
		LeagueID:          leagueID,
		Role:              req.Role,
		IsActive:          true,
		LinkedAt:          time.Now(),
		DisplayName:       req.DisplayName,
		PreferredLanguage: req.PreferredLanguage,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	f.whatsappLinks[link.ID] = link
	f.phoneNumbers[req.PhoneNumber] = true
	return link, nil
}

func (f *fakeRepository) GetWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if l, ok := f.whatsappLinks[linkID]; ok {
		return l, nil
	}
	return WhatsAppLink{}, httpx.ErrNotFound
}

func (f *fakeRepository) UpdateWhatsAppLink(ctx context.Context, linkID uuid.UUID, req *UpdateWhatsAppLinkRequest) (WhatsAppLink, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	link, ok := f.whatsappLinks[linkID]
	if !ok {
		return WhatsAppLink{}, httpx.ErrNotFound
	}

	if req.IsActive != nil {
		link.IsActive = *req.IsActive
	}
	if req.DisplayName != nil {
		link.DisplayName = req.DisplayName
	}
	if req.PreferredLanguage != nil {
		link.PreferredLanguage = *req.PreferredLanguage
	}
	link.UpdatedAt = time.Now()

	f.whatsappLinks[linkID] = link
	return link, nil
}

func (f *fakeRepository) DeactivateWhatsAppLink(ctx context.Context, linkID uuid.UUID) (WhatsAppLink, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	link, ok := f.whatsappLinks[linkID]
	if !ok {
		return WhatsAppLink{}, httpx.ErrNotFound
	}

	link.IsActive = false
	link.UpdatedAt = time.Now()
	f.whatsappLinks[linkID] = link
	return link, nil
}

func (f *fakeRepository) PhoneNumberExists(ctx context.Context, phoneNumber string) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	return f.phoneNumbers[phoneNumber], nil
}

func (f *fakeRepository) GetLeagueID(ctx context.Context, linkID uuid.UUID) (uuid.UUID, error) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if link, ok := f.whatsappLinks[linkID]; ok {
		return link.LeagueID, nil
	}
	return uuid.Nil, httpx.ErrNotFound
}

// fakeAuthz implements authz.Checker for testing.
type fakeAuthz struct {
	allowManageLeague bool
}

func (f *fakeAuthz) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if f.allowManageLeague || p.IsSuperAdmin() {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	return nil
}

func (f *fakeAuthz) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	return nil
}

func (f *fakeAuthz) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return nil
}

func (f *fakeAuthz) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return nil
}

func TestListUsers_SuperAdmin(t *testing.T) {
	userID := uuid.New()
	repo := &fakeRepository{
		users: map[uuid.UUID]User{
			userID: {
				ID:    userID,
				Name:  "John",
				Email: "john@test.com",
				Role:  string(auth.RoleLeagueAdmin),
			},
		},
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	req := &ListUsersRequest{Limit: 50, Offset: 0}

	users, err := svc.ListUsers(context.Background(), caller, req)
	if err != nil {
		t.Fatalf("ListUsers: %v", err)
	}

	if len(users) != 1 {
		t.Errorf("expected 1 user, got %d", len(users))
	}
}

func TestListUsers_Forbidden(t *testing.T) {
	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: false}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}
	req := &ListUsersRequest{Limit: 50, Offset: 0}

	_, err := svc.ListUsers(context.Background(), caller, req)
	if err == nil {
		t.Fatal("expected forbidden error, got nil")
	}
}

func TestListLeagueUsers_Happy(t *testing.T) {
	leagueID := uuid.New()
	userID := uuid.New()

	repo := &fakeRepository{
		users: map[uuid.UUID]User{},
		leagueUsers: map[uuid.UUID][]User{
			leagueID: {
				{
					ID:       userID,
					Name:     "John",
					Email:    "john@test.com",
					Role:     string(auth.RoleTeamOwner),
					LeagueID: &leagueID,
				},
			},
		},
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, LeagueID: &leagueID}

	users, err := svc.ListLeagueUsers(context.Background(), caller, leagueID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListLeagueUsers: %v", err)
	}

	if len(users) != 1 {
		t.Errorf("expected 1 user, got %d", len(users))
	}
}

func TestCreateWhatsAppLink_Happy(t *testing.T) {
	leagueID := uuid.New()

	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       "5551234567",
		Role:              "team_owner",
		PreferredLanguage: "es",
	}

	link, err := svc.CreateWhatsAppLink(context.Background(), caller, leagueID, req)
	if err != nil {
		t.Fatalf("CreateWhatsAppLink: %v", err)
	}

	if link.PhoneNumber != "5551234567" {
		t.Errorf("PhoneNumber mismatch: got %v, want 5551234567", link.PhoneNumber)
	}
	if link.LeagueID != leagueID {
		t.Errorf("LeagueID mismatch: got %v, want %v", link.LeagueID, leagueID)
	}
}

func TestCreateWhatsAppLink_Forbidden(t *testing.T) {
	leagueID := uuid.New()

	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: false}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic}
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       "5551234567",
		Role:              "team_owner",
		PreferredLanguage: "es",
	}

	_, err := svc.CreateWhatsAppLink(context.Background(), caller, leagueID, req)
	if err == nil {
		t.Fatal("expected forbidden error, got nil")
	}
}

func TestCreateWhatsAppLink_Duplicate(t *testing.T) {
	leagueID := uuid.New()

	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  map[string]bool{"5551234567": true},
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &CreateWhatsAppLinkRequest{
		PhoneNumber:       "5551234567",
		Role:              "team_owner",
		PreferredLanguage: "es",
	}

	_, err := svc.CreateWhatsAppLink(context.Background(), caller, leagueID, req)
	if err == nil {
		t.Fatal("expected conflict error, got nil")
	}
}

func TestUpdateWhatsAppLink_Happy(t *testing.T) {
	leagueID := uuid.New()
	linkID := uuid.New()

	repo := &fakeRepository{
		users: make(map[uuid.UUID]User),
		whatsappLinks: map[uuid.UUID]WhatsAppLink{
			linkID: {
				ID:        linkID,
				LeagueID:  leagueID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		},
		phoneNumbers: make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	req := &UpdateWhatsAppLinkRequest{
		IsActive: func() *bool { v := false; return &v }(),
	}

	link, err := svc.UpdateWhatsAppLink(context.Background(), caller, linkID, req)
	if err != nil {
		t.Fatalf("UpdateWhatsAppLink: %v", err)
	}

	if link.IsActive {
		t.Error("expected IsActive to be false")
	}
}

func TestDeactivateWhatsAppLink_Happy(t *testing.T) {
	leagueID := uuid.New()
	linkID := uuid.New()

	repo := &fakeRepository{
		users: make(map[uuid.UUID]User),
		whatsappLinks: map[uuid.UUID]WhatsAppLink{
			linkID: {
				ID:        linkID,
				LeagueID:  leagueID,
				IsActive:  true,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		},
		phoneNumbers: make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}

	link, err := svc.DeactivateWhatsAppLink(context.Background(), caller, linkID)
	if err != nil {
		t.Fatalf("DeactivateWhatsAppLink: %v", err)
	}

	if link.IsActive {
		t.Error("expected IsActive to be false")
	}
}

// HTTP pagination tests
func TestListUsers_EmptyList(t *testing.T) {
	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	req, err := http.NewRequest("GET", "/users?limit=10&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}
	req = req.WithContext(auth.WithPrincipal(req.Context(), caller))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[User]
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.Data == nil {
		t.Error("data should be empty slice, not nil")
	}
	if len(result.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(result.Data))
	}
	if result.Page.Limit != 10 {
		t.Errorf("expected limit 10, got %d", result.Page.Limit)
	}
}

func TestListUsers_LimitCapped(t *testing.T) {
	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	req, err := http.NewRequest("GET", "/users?limit=200&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}
	req = req.WithContext(auth.WithPrincipal(req.Context(), caller))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[User]
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.Page.Limit != 100 {
		t.Errorf("expected limit capped to 100, got %d", result.Page.Limit)
	}
}

func TestListUsers_InvalidLimit(t *testing.T) {
	repo := &fakeRepository{
		users:         make(map[uuid.UUID]User),
		whatsappLinks: make(map[uuid.UUID]WhatsAppLink),
		phoneNumbers:  make(map[string]bool),
	}
	authz := &fakeAuthz{allowManageLeague: true}
	svc := NewService(repo, authz)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin}
	req, err := http.NewRequest("GET", "/users?limit=abc&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}
	req = req.WithContext(auth.WithPrincipal(req.Context(), caller))

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}
