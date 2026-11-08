package leagues

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeRepository implements Repository for testing.
type fakeRepository struct {
	leagues              map[uuid.UUID]League
	tournaments          map[uuid.UUID]Tournament
	failGetLeague        bool
	failCreateLeague     bool
	failGetTournament    bool
	failCreateTournament bool
}

func (f *fakeRepository) GetLeagueByID(ctx context.Context, id uuid.UUID) (League, error) {
	if f.failGetLeague {
		return League{}, httpx.ErrInternal
	}
	if l, ok := f.leagues[id]; ok {
		return l, nil
	}
	return League{}, httpx.ErrNotFound
}

func (f *fakeRepository) GetLeagueBySlug(ctx context.Context, slug string) (League, error) {
	if f.failGetLeague {
		return League{}, httpx.ErrInternal
	}
	for _, l := range f.leagues {
		if l.Slug == slug && l.IsActive {
			return l, nil
		}
	}
	return League{}, httpx.ErrNotFound
}

func (f *fakeRepository) ListActiveLeagues(ctx context.Context, limit int, offset int) ([]League, int, error) {
	var active []League
	for _, l := range f.leagues {
		if l.IsActive {
			active = append(active, l)
		}
	}
	if len(active) <= offset {
		return []League{}, len(active), nil
	}
	end := offset + limit
	if end > len(active) {
		end = len(active)
	}
	return active[offset:end], len(active), nil
}

func (f *fakeRepository) ListLeaguesByAdmin(_ context.Context, adminID uuid.UUID) ([]League, error) {
	var out []League
	for _, l := range f.leagues {
		if l.AdminID == adminID {
			out = append(out, l)
		}
	}
	return out, nil
}

func (f *fakeRepository) ListAllLeagues(ctx context.Context, limit int, offset int) ([]League, int, error) {
	var all []League
	for _, l := range f.leagues {
		all = append(all, l)
	}
	if len(all) <= offset {
		return []League{}, len(all), nil
	}
	end := offset + limit
	if end > len(all) {
		end = len(all)
	}
	return all[offset:end], len(all), nil
}

func (f *fakeRepository) CreateLeague(ctx context.Context, l *League) (uuid.UUID, error) {
	if f.failCreateLeague {
		return uuid.Nil, httpx.ErrInternal
	}
	id := uuid.New()
	l.ID = id
	f.leagues[id] = *l
	return id, nil
}

func (f *fakeRepository) UpdateLeague(ctx context.Context, l *League) error {
	f.leagues[l.ID] = *l
	return nil
}

func (f *fakeRepository) UpdateLeagueProductMode(ctx context.Context, leagueID uuid.UUID, productMode string, features json.RawMessage, updatedBy uuid.UUID) error {
	if l, ok := f.leagues[leagueID]; ok {
		l.ProductMode = productMode
		l.Features = features
		l.ModeUpdatedBy = &updatedBy
		t := time.Now()
		l.ModeUpdatedAt = &t
		f.leagues[leagueID] = l
		return nil
	}
	return httpx.ErrNotFound
}

func (f *fakeRepository) GetTournamentByID(ctx context.Context, id uuid.UUID) (Tournament, error) {
	if f.failGetTournament {
		return Tournament{}, httpx.ErrInternal
	}
	if t, ok := f.tournaments[id]; ok {
		return t, nil
	}
	return Tournament{}, httpx.ErrNotFound
}

func (f *fakeRepository) ListTournamentsByLeague(ctx context.Context, leagueID uuid.UUID, limit int, offset int) ([]Tournament, int, error) {
	var league []Tournament
	for _, t := range f.tournaments {
		if t.LeagueID == leagueID {
			league = append(league, t)
		}
	}
	if len(league) <= offset {
		return []Tournament{}, len(league), nil
	}
	end := offset + limit
	if end > len(league) {
		end = len(league)
	}
	return league[offset:end], len(league), nil
}

func (f *fakeRepository) CreateTournament(ctx context.Context, t *Tournament) (uuid.UUID, error) {
	if f.failCreateTournament {
		return uuid.Nil, httpx.ErrInternal
	}
	id := uuid.New()
	t.ID = id
	f.tournaments[id] = *t
	return id, nil
}

func (f *fakeRepository) UpdateTournament(ctx context.Context, t *Tournament) error {
	f.tournaments[t.ID] = *t
	return nil
}

func (f *fakeRepository) DeleteTournament(ctx context.Context, id uuid.UUID) error {
	if _, ok := f.tournaments[id]; !ok {
		return httpx.ErrNotFound
	}
	delete(f.tournaments, id)
	return nil
}

// fakeChecker implements authz.Checker for testing.
type fakeChecker struct {
	allowLeague     bool
	allowTournament bool
}

func (f *fakeChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if p.IsSuperAdmin() || f.allowLeague {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	if p.IsSuperAdmin() || f.allowTournament {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	return nil
}

func (f *fakeChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	return nil
}

// Tests

func TestCreateLeague_HappyPath(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: true}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	req := &CreateLeagueRequest{
		Name:        "Test League",
		Slug:        "test-league",
		Description: "A test league",
	}

	league, err := svc.CreateLeague(context.Background(), caller, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.Name != "Test League" {
		t.Errorf("expected name 'Test League', got %q", league.Name)
	}
	if league.AdminID != caller.UserID {
		t.Errorf("expected admin_id to be caller, got %v", league.AdminID)
	}
	if !league.IsActive {
		t.Errorf("expected league to be active")
	}
}

func TestCreateLeague_Unauthorized(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RolePublic, IsActive: true}
	req := &CreateLeagueRequest{
		Name:        "Test League",
		Slug:        "test-league",
		Description: "A test league",
	}

	_, err := svc.CreateLeague(context.Background(), caller, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestCreateLeague_SuperAdminCanAssignAdmin(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)

	superAdmin := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}
	targetAdmin := uuid.New()

	req := &CreateLeagueRequest{
		Name:        "Test League",
		Slug:        "test-league",
		Description: "A test league",
		AdminID:     &targetAdmin,
	}

	league, err := svc.CreateLeague(context.Background(), superAdmin, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.AdminID != targetAdmin {
		t.Errorf("expected admin_id %v, got %v", targetAdmin, league.AdminID)
	}
}

func TestUpdateLeague_Authorized(t *testing.T) {
	leagueID := uuid.New()
	adminID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {
				ID:      leagueID,
				Name:    "Old Name",
				AdminID: adminID,
			},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: true}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: adminID, Role: auth.RoleLeagueAdmin, IsActive: true}
	newName := "New Name"
	req := &UpdateLeagueRequest{
		Name: &newName,
	}

	league, err := svc.UpdateLeague(context.Background(), caller, leagueID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.Name != "New Name" {
		t.Errorf("expected name 'New Name', got %q", league.Name)
	}
}

func TestUpdateLeague_Forbidden(t *testing.T) {
	leagueID := uuid.New()
	adminID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {
				ID:      leagueID,
				Name:    "Old Name",
				AdminID: adminID,
			},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: false}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	newName := "New Name"
	req := &UpdateLeagueRequest{
		Name: &newName,
	}

	_, err := svc.UpdateLeague(context.Background(), caller, leagueID, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestCreateTournament_HappyPath(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {ID: leagueID, Name: "Test"},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: true}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	req := &CreateTournamentRequest{
		LeagueID:         leagueID,
		Name:             "Test Tournament",
		StartDate:        "2026-01-01",
		EndDate:          "2026-12-31",
		TournamentFormat: "league",
	}

	tournament, err := svc.CreateTournament(context.Background(), caller, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if tournament.Name != "Test Tournament" {
		t.Errorf("expected name 'Test Tournament', got %q", tournament.Name)
	}
	if tournament.LeagueID != leagueID {
		t.Errorf("expected league_id %v, got %v", leagueID, tournament.LeagueID)
	}
	if tournament.TournamentFormat != "league" {
		t.Errorf("expected format 'league', got %q", tournament.TournamentFormat)
	}
}

func TestCreateTournament_Forbidden(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {ID: leagueID, Name: "Test"},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: false}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner, IsActive: true}
	req := &CreateTournamentRequest{
		LeagueID:         leagueID,
		Name:             "Test Tournament",
		StartDate:        "2026-01-01",
		EndDate:          "2026-12-31",
		TournamentFormat: "league",
	}

	_, err := svc.CreateTournament(context.Background(), caller, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestUpdateProductMode_SuperAdminOnly(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {
				ID:          leagueID,
				ProductMode: "full",
			},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)

	superAdmin := auth.Principal{UserID: uuid.New(), Role: auth.RoleSuperAdmin, IsActive: true}
	req := &UpdateProductModeRequest{
		ProductMode: "web_only",
	}

	league, err := svc.UpdateLeagueProductMode(context.Background(), superAdmin, leagueID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.ProductMode != "web_only" {
		t.Errorf("expected product_mode 'web_only', got %q", league.ProductMode)
	}
}

func TestUpdateProductMode_Forbidden(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {
				ID:          leagueID,
				ProductMode: "full",
			},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)

	admin := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	req := &UpdateProductModeRequest{
		ProductMode: "web_only",
	}

	_, err := svc.UpdateLeagueProductMode(context.Background(), admin, leagueID, req)
	if err != httpx.ErrForbidden {
		t.Errorf("expected ErrForbidden, got %v", err)
	}
}

func TestSetLeagueStatus(t *testing.T) {
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {
				ID:       leagueID,
				IsActive: true,
			},
		},
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{allowLeague: true}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}

	league, err := svc.SetLeagueStatus(context.Background(), caller, leagueID, false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if league.IsActive {
		t.Errorf("expected is_active=false, got true")
	}
}

func TestUpdateTournament_HappyPath(t *testing.T) {
	tournamentID := uuid.New()
	leagueID := uuid.New()
	repo := &fakeRepository{
		leagues: map[uuid.UUID]League{
			leagueID: {ID: leagueID},
		},
		tournaments: map[uuid.UUID]Tournament{
			tournamentID: {
				ID:       tournamentID,
				LeagueID: leagueID,
				Name:     "Old Name",
			},
		},
	}
	checker := &fakeChecker{allowLeague: true}
	svc := NewService(repo, checker)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin, IsActive: true}
	newName := "New Name"
	req := &UpdateTournamentRequest{
		Name: &newName,
	}

	tournament, err := svc.UpdateTournament(context.Background(), caller, tournamentID, req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if tournament.Name != "New Name" {
		t.Errorf("expected name 'New Name', got %q", tournament.Name)
	}
}

func TestValidateCreateLeagueRequest_EmptyFields(t *testing.T) {
	req := &CreateLeagueRequest{}
	errs := req.Validate()

	if len(errs) != 3 {
		t.Errorf("expected 3 errors, got %d", len(errs))
	}
	if errs["name"] == "" || errs["slug"] == "" || errs["description"] == "" {
		t.Errorf("expected validation errors for empty fields")
	}
}

func TestValidateCreateTournamentRequest_InvalidFormat(t *testing.T) {
	req := &CreateTournamentRequest{
		Name:             "Test",
		LeagueID:         uuid.New(),
		StartDate:        "2026-01-01",
		EndDate:          "2026-12-31",
		TournamentFormat: "invalid_format",
	}
	errs := req.Validate()

	if errs["tournament_format"] == "" {
		t.Errorf("expected validation error for invalid tournament_format")
	}
}

// HTTP pagination tests
func TestListActiveLeagues_EmptyList(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	req, err := http.NewRequest("GET", "/leagues?limit=10&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[League]
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

func TestListActiveLeagues_LimitCapped(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	req, err := http.NewRequest("GET", "/leagues?limit=200&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[League]
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.Page.Limit != 100 {
		t.Errorf("expected limit capped to 100, got %d", result.Page.Limit)
	}
}

func TestListActiveLeagues_InvalidLimit(t *testing.T) {
	repo := &fakeRepository{
		leagues:     make(map[uuid.UUID]League),
		tournaments: make(map[uuid.UUID]Tournament),
	}
	checker := &fakeChecker{}
	svc := NewService(repo, checker)
	handler := NewHandler(svc)

	router := chi.NewRouter()
	handler.Routes(router)

	req, err := http.NewRequest("GET", "/leagues?limit=abc&offset=0", nil)
	if err != nil {
		t.Fatal(err)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}
