package teams

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/database"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// Fake implementations for testing
type fakeRepository struct {
	teams                            map[uuid.UUID]Team
	players                          map[uuid.UUID]Player
	coachingStaff                    map[uuid.UUID]CoachingStaff
	playerRegistrationRequests       map[uuid.UUID]PlayerRegistrationRequest
	teamsByLeague                    map[uuid.UUID][]Team
	playersByTeam                    map[uuid.UUID][]Player
	coachingStaffByTeam              map[uuid.UUID][]CoachingStaff
	playerRegistrationRequestsByTeam map[uuid.UUID][]PlayerRegistrationRequest
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		teams:                            make(map[uuid.UUID]Team),
		players:                          make(map[uuid.UUID]Player),
		coachingStaff:                    make(map[uuid.UUID]CoachingStaff),
		playerRegistrationRequests:       make(map[uuid.UUID]PlayerRegistrationRequest),
		teamsByLeague:                    make(map[uuid.UUID][]Team),
		playersByTeam:                    make(map[uuid.UUID][]Player),
		coachingStaffByTeam:              make(map[uuid.UUID][]CoachingStaff),
		playerRegistrationRequestsByTeam: make(map[uuid.UUID][]PlayerRegistrationRequest),
	}
}

func (r *fakeRepository) GetTeamByID(ctx context.Context, teamID uuid.UUID) (Team, error) {
	if team, ok := r.teams[teamID]; ok {
		return team, nil
	}
	return Team{}, httpx.ErrNotFound
}

func (r *fakeRepository) GetTeamsByLeague(ctx context.Context, leagueID uuid.UUID, limit, offset int) ([]Team, error) {
	if teams, ok := r.teamsByLeague[leagueID]; ok {
		return teams, nil
	}
	return []Team{}, nil
}

func (r *fakeRepository) GetTeamsByOwner(ctx context.Context, ownerID uuid.UUID, limit, offset int) ([]Team, error) {
	var result []Team
	for _, team := range r.teams {
		if team.OwnerID == ownerID && team.IsActive {
			result = append(result, team)
		}
	}
	return result, nil
}

func (r *fakeRepository) CreateTeam(ctx context.Context, team Team) (Team, error) {
	team.CreatedAt = time.Now()
	team.UpdatedAt = time.Now()
	r.teams[team.ID] = team
	return team, nil
}

func (r *fakeRepository) UpdateTeam(ctx context.Context, teamID uuid.UUID, req UpdateTeamRequest) (Team, error) {
	team, ok := r.teams[teamID]
	if !ok {
		return Team{}, httpx.ErrNotFound
	}
	if req.Name != nil {
		team.Name = *req.Name
	}
	team.UpdatedAt = time.Now()
	r.teams[teamID] = team
	return team, nil
}

func (r *fakeRepository) ActivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error) {
	team, ok := r.teams[teamID]
	if !ok {
		return Team{}, httpx.ErrNotFound
	}
	team.IsActive = true
	team.UpdatedAt = time.Now()
	r.teams[teamID] = team
	return team, nil
}

func (r *fakeRepository) DeactivateTeam(ctx context.Context, teamID uuid.UUID) (Team, error) {
	team, ok := r.teams[teamID]
	if !ok {
		return Team{}, httpx.ErrNotFound
	}
	team.IsActive = false
	team.UpdatedAt = time.Now()
	r.teams[teamID] = team
	return team, nil
}

func (r *fakeRepository) GetPlayerByID(ctx context.Context, playerID uuid.UUID) (Player, error) {
	if player, ok := r.players[playerID]; ok {
		return player, nil
	}
	return Player{}, httpx.ErrNotFound
}

func (r *fakeRepository) GetPlayersByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]Player, error) {
	if players, ok := r.playersByTeam[teamID]; ok {
		return players, nil
	}
	return []Player{}, nil
}

func (r *fakeRepository) CreatePlayer(ctx context.Context, player Player) (Player, error) {
	player.CreatedAt = time.Now()
	player.UpdatedAt = time.Now()
	r.players[player.ID] = player
	return player, nil
}

func (r *fakeRepository) UpdatePlayer(ctx context.Context, playerID uuid.UUID, req UpdatePlayerRequest) (Player, error) {
	player, ok := r.players[playerID]
	if !ok {
		return Player{}, httpx.ErrNotFound
	}
	if req.Name != nil {
		player.Name = *req.Name
	}
	player.UpdatedAt = time.Now()
	r.players[playerID] = player
	return player, nil
}

func (r *fakeRepository) DeactivatePlayer(ctx context.Context, playerID uuid.UUID) (Player, error) {
	player, ok := r.players[playerID]
	if !ok {
		return Player{}, httpx.ErrNotFound
	}
	player.IsActive = false
	player.UpdatedAt = time.Now()
	r.players[playerID] = player
	return player, nil
}

func (r *fakeRepository) GetCoachingStaffByID(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error) {
	if staff, ok := r.coachingStaff[staffID]; ok {
		return staff, nil
	}
	return CoachingStaff{}, httpx.ErrNotFound
}

func (r *fakeRepository) GetCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]CoachingStaff, error) {
	if staff, ok := r.coachingStaffByTeam[teamID]; ok {
		return staff, nil
	}
	return []CoachingStaff{}, nil
}

func (r *fakeRepository) CreateCoachingStaff(ctx context.Context, staff CoachingStaff) (CoachingStaff, error) {
	staff.CreatedAt = time.Now()
	staff.UpdatedAt = time.Now()
	r.coachingStaff[staff.ID] = staff
	return staff, nil
}

func (r *fakeRepository) UpdateCoachingStaff(ctx context.Context, staffID uuid.UUID, req UpdateCoachingStaffRequest) (CoachingStaff, error) {
	staff, ok := r.coachingStaff[staffID]
	if !ok {
		return CoachingStaff{}, httpx.ErrNotFound
	}
	if req.Name != nil {
		staff.Name = *req.Name
	}
	staff.UpdatedAt = time.Now()
	r.coachingStaff[staffID] = staff
	return staff, nil
}

func (r *fakeRepository) DeactivateCoachingStaff(ctx context.Context, staffID uuid.UUID) (CoachingStaff, error) {
	staff, ok := r.coachingStaff[staffID]
	if !ok {
		return CoachingStaff{}, httpx.ErrNotFound
	}
	staff.IsActive = false
	staff.UpdatedAt = time.Now()
	r.coachingStaff[staffID] = staff
	return staff, nil
}

func (r *fakeRepository) GetPlayerRegistrationRequestByID(ctx context.Context, reqID uuid.UUID) (PlayerRegistrationRequest, error) {
	if req, ok := r.playerRegistrationRequests[reqID]; ok {
		return req, nil
	}
	return PlayerRegistrationRequest{}, httpx.ErrNotFound
}

func (r *fakeRepository) GetPlayerRegistrationRequestsByTeam(ctx context.Context, teamID uuid.UUID, limit, offset int) ([]PlayerRegistrationRequest, error) {
	if reqs, ok := r.playerRegistrationRequestsByTeam[teamID]; ok {
		return reqs, nil
	}
	return []PlayerRegistrationRequest{}, nil
}

func (r *fakeRepository) GetPlayerRegistrationRequestsByTournament(ctx context.Context, tournamentID uuid.UUID, status string, limit, offset int) ([]PlayerRegistrationRequest, error) {
	var result []PlayerRegistrationRequest
	for _, req := range r.playerRegistrationRequests {
		if req.TournamentID == tournamentID && req.Status == status {
			result = append(result, req)
		}
	}
	return result, nil
}

func (r *fakeRepository) CreatePlayerRegistrationRequest(ctx context.Context, req PlayerRegistrationRequest) (PlayerRegistrationRequest, error) {
	req.CreatedAt = time.Now()
	req.UpdatedAt = time.Now()
	r.playerRegistrationRequests[req.ID] = req
	return req, nil
}

func (r *fakeRepository) ReviewPlayerRegistrationRequest(ctx context.Context, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	req, ok := r.playerRegistrationRequests[reqID]
	if !ok {
		return PlayerRegistrationRequest{}, httpx.ErrNotFound
	}
	req.Status = status
	req.ReviewedBy = &reviewedBy
	req.ReviewNotes = notes
	now := time.Now()
	req.ReviewedAt = &now
	req.UpdatedAt = time.Now()
	r.playerRegistrationRequests[reqID] = req
	return req, nil
}

func (r *fakeRepository) CountPlayersByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	if players, ok := r.playersByTeam[teamID]; ok {
		return len(players), nil
	}
	return 0, nil
}

func (r *fakeRepository) CountCoachingStaffByTeam(ctx context.Context, teamID uuid.UUID) (int, error) {
	if staff, ok := r.coachingStaffByTeam[teamID]; ok {
		return len(staff), nil
	}
	return 0, nil
}

func (r *fakeRepository) GetTournamentByID(ctx context.Context, tournamentID uuid.UUID) (Tournament, error) {
	// Stub implementation for tests
	return Tournament{}, httpx.ErrNotFound
}

func (r *fakeRepository) CountPendingPlayerRegistrationsByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	// Stub implementation for tests
	return 0, nil
}

func (r *fakeRepository) CountPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	// Stub implementation for tests
	return 0, nil
}

func (r *fakeRepository) CountExceptionPlayersByTeamTournament(ctx context.Context, teamID, tournamentID uuid.UUID) (int, error) {
	// Stub implementation for tests
	return 0, nil
}

func (r *fakeRepository) GetPlayersByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Player, error) {
	// Stub implementation for tests
	return nil, nil
}

func (r *fakeRepository) CreatePlayerTx(ctx context.Context, q database.Querier, player Player) (Player, error) {
	// Stub implementation for tests
	player.ID = uuid.New()
	player.CreatedAt = time.Now()
	player.UpdatedAt = time.Now()
	r.players[player.ID] = player
	if _, ok := r.playersByTeam[player.TeamID]; !ok {
		r.playersByTeam[player.TeamID] = []Player{}
	}
	r.playersByTeam[player.TeamID] = append(r.playersByTeam[player.TeamID], player)
	return player, nil
}

func (r *fakeRepository) ReviewPlayerRegistrationRequestTx(ctx context.Context, q database.Querier, reqID uuid.UUID, status string, reviewedBy uuid.UUID, notes *string) (PlayerRegistrationRequest, error) {
	// Stub implementation for tests
	if req, ok := r.playerRegistrationRequests[reqID]; ok {
		req.Status = status
		req.ReviewedBy = &reviewedBy
		req.ReviewNotes = notes
		req.ReviewedAt = timePtr(time.Now())
		r.playerRegistrationRequests[reqID] = req
		return req, nil
	}
	return PlayerRegistrationRequest{}, httpx.ErrNotFound
}

func timePtr(t time.Time) *time.Time {
	return &t
}

// Fake authz checker
type fakeAuthzChecker struct {
	allowedTeams   map[uuid.UUID]bool
	allowedPlayers map[uuid.UUID]bool
	allowedLeagues map[uuid.UUID]bool
}

func newFakeAuthzChecker() *fakeAuthzChecker {
	return &fakeAuthzChecker{
		allowedTeams:   make(map[uuid.UUID]bool),
		allowedPlayers: make(map[uuid.UUID]bool),
		allowedLeagues: make(map[uuid.UUID]bool),
	}
}

func (c *fakeAuthzChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if p.IsSuperAdmin() || c.allowedLeagues[leagueID] {
		return nil
	}
	return httpx.ErrForbidden
}

func (c *fakeAuthzChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	if p.IsSuperAdmin() {
		return nil
	}
	return httpx.ErrForbidden
}

func (c *fakeAuthzChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if p.IsSuperAdmin() {
		return nil
	}
	return httpx.ErrForbidden
}

func (c *fakeAuthzChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	if p.IsSuperAdmin() || c.allowedTeams[teamID] {
		return nil
	}
	return httpx.ErrForbidden
}

func (c *fakeAuthzChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	if p.IsSuperAdmin() || c.allowedPlayers[playerID] {
		return nil
	}
	return httpx.ErrForbidden
}

// Test helpers
func newTestHandler() (*Handler, *fakeRepository, *fakeAuthzChecker) {
	repo := newFakeRepository()
	authz := newFakeAuthzChecker()
	svc := NewService(repo, nil, authz) // pool is nil for unit tests
	handler := NewHandler(svc)
	return handler, repo, authz
}

func TestGetTeam_Happy(t *testing.T) {
	handler, repo, _ := newTestHandler()

	teamID := uuid.New()
	leagueID := uuid.New()
	team := Team{
		ID:        teamID,
		Name:      "Test Team",
		Slug:      "test-team",
		LeagueID:  leagueID,
		OwnerID:   uuid.New(),
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	repo.teams[teamID] = team

	r := httptest.NewRequest("GET", fmt.Sprintf("/teams/%s", teamID), nil)
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("teamID", teamID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	handler.getTeam(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result Team
	json.NewDecoder(w.Body).Decode(&result)
	if result.ID != teamID {
		t.Errorf("expected team ID %s, got %s", teamID, result.ID)
	}
}

func TestGetTeam_NotFound(t *testing.T) {
	handler, _, _ := newTestHandler()

	teamID := uuid.New()
	r := httptest.NewRequest("GET", fmt.Sprintf("/teams/%s", teamID), nil)
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("teamID", teamID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	handler.getTeam(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestCreateTeam_Happy(t *testing.T) {
	handler, _, authz := newTestHandler()

	leagueID := uuid.New()
	callerID := uuid.New()
	authz.allowedLeagues[leagueID] = true

	req := CreateTeamRequest{
		Name:     "New Team",
		Slug:     "new-team",
		LeagueID: leagueID,
	}
	body, _ := json.Marshal(req)

	r := httptest.NewRequest("POST", "/teams", bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	caller := auth.Principal{
		UserID: callerID,
		Role:   auth.RoleLeagueAdmin,
	}
	r = r.WithContext(auth.WithPrincipal(r.Context(), caller))

	handler.createTeam(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d; body: %s", w.Code, w.Body.String())
	}

	var result Team
	json.NewDecoder(w.Body).Decode(&result)
	if result.Name != "New Team" {
		t.Errorf("expected name 'New Team', got %s", result.Name)
	}
}

func TestCreateTeam_Forbidden(t *testing.T) {
	handler, _, authz := newTestHandler()

	leagueID := uuid.New()
	callerID := uuid.New()
	// Don't allow this league
	authz.allowedLeagues[leagueID] = false

	req := CreateTeamRequest{
		Name:     "New Team",
		Slug:     "new-team",
		LeagueID: leagueID,
	}
	body, _ := json.Marshal(req)

	r := httptest.NewRequest("POST", "/teams", bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	caller := auth.Principal{
		UserID: callerID,
		Role:   auth.RoleTeamOwner,
	}
	r = r.WithContext(auth.WithPrincipal(r.Context(), caller))

	handler.createTeam(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestCreatePlayer_Forbidden(t *testing.T) {
	handler, _, authz := newTestHandler()

	teamID := uuid.New()
	callerID := uuid.New()

	// Don't allow this team
	authz.allowedTeams[teamID] = false

	req := CreatePlayerRequest{
		Name:         "Player Name",
		Position:     "Forward",
		JerseyNumber: 10,
	}
	body, _ := json.Marshal(req)

	r := httptest.NewRequest("POST", fmt.Sprintf("/teams/%s/players", teamID), bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("teamID", teamID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	caller := auth.Principal{
		UserID: callerID,
		Role:   auth.RoleTeamOwner,
	}
	r = r.WithContext(auth.WithPrincipal(r.Context(), caller))

	handler.createPlayer(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", w.Code)
	}
}

func TestCreatePlayer_InvalidInput(t *testing.T) {
	handler, _, authz := newTestHandler()

	teamID := uuid.New()
	callerID := uuid.New()
	authz.allowedTeams[teamID] = true

	// Invalid jersey number
	req := CreatePlayerRequest{
		Name:         "Player Name",
		Position:     "Forward",
		JerseyNumber: 100, // Too high
	}
	body, _ := json.Marshal(req)

	r := httptest.NewRequest("POST", fmt.Sprintf("/teams/%s/players", teamID), bytes.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("teamID", teamID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	caller := auth.Principal{
		UserID: callerID,
		Role:   auth.RoleTeamOwner,
	}
	r = r.WithContext(auth.WithPrincipal(r.Context(), caller))

	handler.createPlayer(w, r)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

// HTTP pagination tests
func TestGetTeamsByLeague_EmptyList(t *testing.T) {
	handler, _, _ := newTestHandler()

	leagueID := uuid.New()

	r := httptest.NewRequest("GET", fmt.Sprintf("/teams?leagueID=%s&limit=10&offset=0", leagueID), nil)
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("leagueID", leagueID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	handler.getTeamsByLeague(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[Team]
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

func TestGetTeamsByLeague_LimitCapped(t *testing.T) {
	handler, _, _ := newTestHandler()

	leagueID := uuid.New()

	r := httptest.NewRequest("GET", fmt.Sprintf("/teams?leagueID=%s&limit=200&offset=0", leagueID), nil)
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("leagueID", leagueID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	handler.getTeamsByLeague(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}

	var result httpx.ListResponse[Team]
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}

	if result.Page.Limit != 100 {
		t.Errorf("expected limit capped to 100, got %d", result.Page.Limit)
	}
}

func TestGetTeamsByLeague_InvalidLimit(t *testing.T) {
	handler, _, _ := newTestHandler()

	leagueID := uuid.New()

	r := httptest.NewRequest("GET", fmt.Sprintf("/teams?leagueID=%s&limit=abc&offset=0", leagueID), nil)
	w := httptest.NewRecorder()

	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("leagueID", leagueID.String())
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	handler.getTeamsByLeague(w, r)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}
