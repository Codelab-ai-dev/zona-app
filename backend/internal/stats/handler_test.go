package stats

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// listResponseHelper is used to decode list responses in tests
type listResponseHelper[T any] struct {
	Data []T        `json:"data"`
	Page httpx.Page `json:"page"`
}

type fakeAuthz struct {
	allowed bool
}

var _ authz.Checker = (*fakeAuthz)(nil)

func (f *fakeAuthz) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthz) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

type fakeRepo struct {
	standings   map[uuid.UUID][]Standings
	teamStats   map[uuid.UUID]TeamStats
	playerStats map[uuid.UUID]PlayerStats
	topScorers  map[uuid.UUID][]TopScorersRow
	discipline  map[uuid.UUID][]DisciplineRow
	suspensions map[uuid.UUID]Suspension
	hidden      map[uuid.UUID]bool // resources whose league is inactive
}

func (f fakeRepo) IsPubliclyVisible(_ context.Context, _ Scope, id uuid.UUID) (bool, error) {
	return !f.hidden[id], nil
}

func (f fakeRepo) GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Standings, error) {
	if s, ok := f.standings[tournamentID]; ok {
		return s, nil
	}
	return nil, httpx.ErrNotFound
}

func (f fakeRepo) GetTeamStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) (TeamStats, error) {
	if ts, ok := f.teamStats[teamID]; ok {
		return ts, nil
	}
	return TeamStats{}, httpx.ErrNotFound
}

func (f fakeRepo) UpdateTeamPointsAdjustment(ctx context.Context, teamID uuid.UUID, tournamentID uuid.UUID, adjustment int, reason string) error {
	return nil
}

func (f fakeRepo) GetPlayerStats(ctx context.Context, playerID uuid.UUID) (PlayerStats, error) {
	if ps, ok := f.playerStats[playerID]; ok {
		return ps, nil
	}
	return PlayerStats{}, httpx.ErrNotFound
}

func (f fakeRepo) GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]TopScorersRow, error) {
	if ts, ok := f.topScorers[tournamentID]; ok {
		return ts, nil
	}
	return nil, httpx.ErrNotFound
}

func (f fakeRepo) GetDisciplineByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]DisciplineRow, error) {
	if d, ok := f.discipline[tournamentID]; ok {
		return d, nil
	}
	return nil, httpx.ErrNotFound
}

func (f fakeRepo) GetPlayerStatsByTeam(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]PlayerStats, error) {
	return nil, nil
}

func (f fakeRepo) GetSuspensionByID(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	if s, ok := f.suspensions[suspensionID]; ok {
		return s, nil
	}
	return Suspension{}, httpx.ErrNotFound
}

func (f fakeRepo) GetSuspensionsByLeague(ctx context.Context, leagueID uuid.UUID) ([]Suspension, error) {
	return nil, nil
}

func (f fakeRepo) GetSuspensionsByTeam(ctx context.Context, teamID uuid.UUID) ([]Suspension, error) {
	return nil, nil
}

func (f fakeRepo) CreateSuspension(ctx context.Context, leagueID uuid.UUID, req *CreateSuspensionRequest) (Suspension, error) {
	return Suspension{ID: uuid.New()}, nil
}

func (f fakeRepo) UpdateSuspension(ctx context.Context, suspensionID uuid.UUID, req *UpdateSuspensionRequest) (Suspension, error) {
	return f.GetSuspensionByID(ctx, suspensionID)
}

func (f fakeRepo) CancelSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	return f.GetSuspensionByID(ctx, suspensionID)
}

func (f fakeRepo) CompleteSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	return f.GetSuspensionByID(ctx, suspensionID)
}

func (f fakeRepo) ApplySuspensionToMatch(ctx context.Context, suspensionID uuid.UUID, matchID uuid.UUID) error {
	return nil
}

func (f fakeRepo) GetPlayerTeamLeague(ctx context.Context, playerID uuid.UUID) (PlayerTeamLeague, error) {
	return PlayerTeamLeague{}, httpx.ErrNotFound
}

func (f fakeRepo) GetMatchWithTeams(ctx context.Context, matchID uuid.UUID) (MatchWithTeams, error) {
	return MatchWithTeams{}, httpx.ErrNotFound
}

func newTestRouter(repo Repository, azChecker authz.Checker) chi.Router {
	r := chi.NewRouter()
	svc := NewService(repo, azChecker)
	NewHandler(svc).Routes(r)
	return r
}

func TestGetStandingsByTournament(t *testing.T) {
	tournamentID := uuid.New()
	standings := []Standings{
		{
			Position:       1,
			TeamID:         uuid.New(),
			TeamName:       "FC Local",
			MatchesPlayed:  10,
			MatchesWon:     8,
			MatchesDrawn:   1,
			MatchesLost:    1,
			GoalsFor:       25,
			GoalsAgainst:   5,
			GoalDifference: 20,
			Points:         25,
		},
	}

	repo := fakeRepo{standings: map[uuid.UUID][]Standings{tournamentID: standings}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/standings", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got listResponseHelper[Standings]
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if len(got.Data) != 1 || got.Data[0].TeamName != "FC Local" {
		t.Errorf("standings = %+v, want FC Local", got.Data)
	}
}

func TestGetPlayerStats(t *testing.T) {
	playerID := uuid.New()
	stats := PlayerStats{
		ID:            playerID,
		PlayerName:    "Messi",
		JerseyNumber:  10,
		TeamName:      "FC Local",
		MatchesPlayed: 5,
		Goals:         3,
	}

	repo := fakeRepo{playerStats: map[uuid.UUID]PlayerStats{playerID: stats}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/players/"+playerID.String()+"/stats", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got PlayerStats
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if got.PlayerName != "Messi" {
		t.Errorf("player = %s, want Messi", got.PlayerName)
	}
}

func TestUpdateTeamPointsAdjustment_Forbidden(t *testing.T) {
	teamID, _ := uuid.Parse("00000000-0000-0000-0000-000000000001")
	tournamentID, _ := uuid.Parse("00000000-0000-0000-0000-000000000002")

	repo := fakeRepo{
		teamStats: map[uuid.UUID]TeamStats{
			teamID: {
				TeamID:       teamID,
				TournamentID: tournamentID,
			},
		},
	}
	router := newTestRouter(repo, &fakeAuthz{allowed: false})

	leagueAdminID := uuid.New()
	principal := auth.Principal{
		UserID:   leagueAdminID,
		Role:     auth.RoleLeagueAdmin,
		IsActive: true,
	}

	req := httptest.NewRequest(http.MethodPost, "/standings/adjust", strings.NewReader(`{
		"team_id": "00000000-0000-0000-0000-000000000001",
		"tournament_id": "00000000-0000-0000-0000-000000000002",
		"points_adjustment": 3,
		"adjustment_reason": "Fair play"
	}`))
	req.Header.Set("Content-Type", "application/json")
	req = req.WithContext(auth.WithPrincipal(req.Context(), principal))
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d (forbidden); body = %s", rec.Code, http.StatusForbidden, rec.Body.String())
	}
}

func TestCreateSuspension_Unauthenticated(t *testing.T) {
	repo := fakeRepo{}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodPost, "/suspensions?league_id=00000000-0000-0000-0000-000000000001", strings.NewReader(`{
		"player_id": "00000000-0000-0000-0000-000000000002",
		"team_id": "00000000-0000-0000-0000-000000000003",
		"suspension_type": "red_card",
		"reason": "Violent conduct",
		"matches_to_serve": 2
	}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d (unauthorized)", rec.Code, http.StatusUnauthorized)
	}
}

func TestGetTopScorersByTournament(t *testing.T) {
	tournamentID := uuid.New()
	scorers := []TopScorersRow{
		{
			ID:            uuid.New(),
			PlayerName:    "Ronaldo",
			JerseyNumber:  7,
			TeamName:      "FC Local",
			MatchesPlayed: 5,
			Goals:         4,
			Assists:       1,
		},
	}

	repo := fakeRepo{topScorers: map[uuid.UUID][]TopScorersRow{tournamentID: scorers}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/top-scorers", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got listResponseHelper[TopScorersRow]
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if len(got.Data) != 1 || got.Data[0].PlayerName != "Ronaldo" {
		t.Errorf("scorers = %+v, want Ronaldo", got.Data)
	}
}

func TestGetDisciplineByTournament(t *testing.T) {
	tournamentID := uuid.New()
	discipline := []DisciplineRow{
		{
			ID:            uuid.New(),
			PlayerName:    "Pepe",
			JerseyNumber:  3,
			TeamName:      "FC Local",
			MatchesPlayed: 5,
			YellowCards:   3,
			RedCards:      1,
		},
	}

	repo := fakeRepo{discipline: map[uuid.UUID][]DisciplineRow{tournamentID: discipline}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/discipline", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got listResponseHelper[DisciplineRow]
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if len(got.Data) != 1 || got.Data[0].PlayerName != "Pepe" {
		t.Errorf("discipline = %+v, want Pepe", got.Data)
	}
}

func TestValidateCreateSuspensionRequest(t *testing.T) {
	tests := []struct {
		name   string
		req    *CreateSuspensionRequest
		hasErr bool
	}{
		{
			name: "valid",
			req: &CreateSuspensionRequest{
				PlayerID:       uuid.New(),
				TeamID:         uuid.New(),
				SuspensionType: "red_card",
				Reason:         "Violent conduct",
				MatchesToServe: 2,
			},
			hasErr: false,
		},
		{
			name: "missing player_id",
			req: &CreateSuspensionRequest{
				PlayerID:       uuid.Nil,
				TeamID:         uuid.New(),
				SuspensionType: "red_card",
				Reason:         "Violent conduct",
				MatchesToServe: 2,
			},
			hasErr: true,
		},
		{
			name: "invalid suspension_type",
			req: &CreateSuspensionRequest{
				PlayerID:       uuid.New(),
				TeamID:         uuid.New(),
				SuspensionType: "invalid_type",
				Reason:         "Violent conduct",
				MatchesToServe: 2,
			},
			hasErr: true,
		},
		{
			name: "invalid matches_to_serve",
			req: &CreateSuspensionRequest{
				PlayerID:       uuid.New(),
				TeamID:         uuid.New(),
				SuspensionType: "red_card",
				Reason:         "Violent conduct",
				MatchesToServe: 0,
			},
			hasErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errs := tt.req.Validate()
			if (len(errs) > 0) != tt.hasErr {
				t.Errorf("validation errors = %v, hasErr = %v", errs, tt.hasErr)
			}
		})
	}
}

func TestValidatePointsAdjustmentRequest(t *testing.T) {
	tests := []struct {
		name   string
		req    *PointsAdjustmentRequest
		hasErr bool
	}{
		{
			name: "valid",
			req: &PointsAdjustmentRequest{
				TeamID:           uuid.New(),
				TournamentID:     uuid.New(),
				PointsAdjustment: 3,
				AdjustmentReason: "Fair play award",
			},
			hasErr: false,
		},
		{
			name: "missing team_id",
			req: &PointsAdjustmentRequest{
				TeamID:           uuid.Nil,
				TournamentID:     uuid.New(),
				PointsAdjustment: 3,
				AdjustmentReason: "Fair play award",
			},
			hasErr: true,
		},
		{
			name: "missing reason",
			req: &PointsAdjustmentRequest{
				TeamID:           uuid.New(),
				TournamentID:     uuid.New(),
				PointsAdjustment: 3,
				AdjustmentReason: "",
			},
			hasErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errs := tt.req.Validate()
			if (len(errs) > 0) != tt.hasErr {
				t.Errorf("validation errors = %v, hasErr = %v", errs, tt.hasErr)
			}
		})
	}
}

// Import errors package for IDOR tests

// TestIDOR_CreateSuspension_ForeignLeaguePlayer tests that a league admin cannot
// create suspensions for players from a different league.
func TestIDOR_CreateSuspension_ForeignLeaguePlayer(t *testing.T) {
	leagueA := uuid.New()
	leagueB := uuid.New()
	playerInLeagueB := uuid.New()
	teamInLeagueB := uuid.New()

	// fakeRepo that returns player in league B when queried
	repo := &fakeIDORRepo{
		playerTeamLeague: map[uuid.UUID]PlayerTeamLeague{
			playerInLeagueB: {
				PlayerID: playerInLeagueB,
				TeamID:   teamInLeagueB,
				LeagueID: leagueB, // Player is in league B
			},
		},
	}

	svc := NewService(repo, &fakeAuthz{allowed: true})
	_, err := svc.CreateSuspension(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, leagueA, &CreateSuspensionRequest{
		PlayerID:       playerInLeagueB,
		TeamID:         teamInLeagueB,
		SuspensionType: "red_card",
		Reason:         "Test",
		MatchesToServe: 1,
	})

	if !errors.Is(err, httpx.ErrForbidden) {
		t.Errorf("expected ErrForbidden for foreign league player, got %v", err)
	}
}

// TestIDOR_ApplySuspensionToMatch_WrongTeam tests that a suspension cannot be applied
// to a match where the suspended player's team doesn't play.
func TestIDOR_ApplySuspensionToMatch_WrongTeam(t *testing.T) {
	suspensionID := uuid.New()
	matchID := uuid.New()
	suspendedTeam := uuid.New()
	homeTeam := uuid.New()
	awayTeam := uuid.New()

	repo := &fakeIDORRepo{
		suspensions: map[uuid.UUID]Suspension{
			suspensionID: {
				ID:     suspensionID,
				TeamID: suspendedTeam,
				Status: "active",
			},
		},
		matchWithTeams: map[uuid.UUID]MatchWithTeams{
			matchID: {
				MatchID:    matchID,
				HomeTeamID: homeTeam,
				AwayTeamID: awayTeam,
				// suspendedTeam is NOT in this match
			},
		},
	}

	svc := NewService(repo, &fakeAuthz{allowed: true})
	err := svc.ApplySuspensionToMatch(context.Background(), auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}, suspensionID, matchID)

	if !errors.Is(err, httpx.ErrBadRequest) {
		t.Errorf("expected ErrBadRequest for team not in match, got %v", err)
	}
}

// fakeIDORRepo implements Repository for IDOR testing.
type fakeIDORRepo struct {
	playerTeamLeague map[uuid.UUID]PlayerTeamLeague
	suspensions      map[uuid.UUID]Suspension
	matchWithTeams   map[uuid.UUID]MatchWithTeams
}

func (f *fakeIDORRepo) IsPubliclyVisible(context.Context, Scope, uuid.UUID) (bool, error) {
	return true, nil
}

func (f *fakeIDORRepo) GetStandingsByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Standings, error) {
	return nil, nil
}

func (f *fakeIDORRepo) GetTeamStats(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) (TeamStats, error) {
	return TeamStats{}, httpx.ErrNotFound
}

func (f *fakeIDORRepo) UpdateTeamPointsAdjustment(ctx context.Context, teamID uuid.UUID, tournamentID uuid.UUID, adjustment int, reason string) error {
	return nil
}

func (f *fakeIDORRepo) GetPlayerStats(ctx context.Context, playerID uuid.UUID) (PlayerStats, error) {
	return PlayerStats{}, httpx.ErrNotFound
}

func (f *fakeIDORRepo) GetTopScorersByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]TopScorersRow, error) {
	return nil, nil
}

func (f *fakeIDORRepo) GetDisciplineByTournament(ctx context.Context, tournamentID uuid.UUID, limit int) ([]DisciplineRow, error) {
	return nil, nil
}

func (f *fakeIDORRepo) GetPlayerStatsByTeam(ctx context.Context, teamID uuid.UUID, tournamentID *uuid.UUID) ([]PlayerStats, error) {
	return nil, nil
}

func (f *fakeIDORRepo) GetSuspensionByID(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	if s, ok := f.suspensions[suspensionID]; ok {
		return s, nil
	}
	return Suspension{}, httpx.ErrNotFound
}

func (f *fakeIDORRepo) GetSuspensionsByLeague(ctx context.Context, leagueID uuid.UUID) ([]Suspension, error) {
	return nil, nil
}

func (f *fakeIDORRepo) GetSuspensionsByTeam(ctx context.Context, teamID uuid.UUID) ([]Suspension, error) {
	return nil, nil
}

func (f *fakeIDORRepo) CreateSuspension(ctx context.Context, leagueID uuid.UUID, req *CreateSuspensionRequest) (Suspension, error) {
	return Suspension{ID: uuid.New()}, nil
}

func (f *fakeIDORRepo) UpdateSuspension(ctx context.Context, suspensionID uuid.UUID, req *UpdateSuspensionRequest) (Suspension, error) {
	return Suspension{}, nil
}

func (f *fakeIDORRepo) CancelSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	return Suspension{}, nil
}

func (f *fakeIDORRepo) CompleteSuspension(ctx context.Context, suspensionID uuid.UUID) (Suspension, error) {
	return Suspension{}, nil
}

func (f *fakeIDORRepo) ApplySuspensionToMatch(ctx context.Context, suspensionID uuid.UUID, matchID uuid.UUID) error {
	return nil
}

func (f *fakeIDORRepo) GetPlayerTeamLeague(ctx context.Context, playerID uuid.UUID) (PlayerTeamLeague, error) {
	if ptl, ok := f.playerTeamLeague[playerID]; ok {
		return ptl, nil
	}
	return PlayerTeamLeague{}, httpx.ErrNotFound
}

func (f *fakeIDORRepo) GetMatchWithTeams(ctx context.Context, matchID uuid.UUID) (MatchWithTeams, error) {
	if m, ok := f.matchWithTeams[matchID]; ok {
		return m, nil
	}
	return MatchWithTeams{}, httpx.ErrNotFound
}

func TestPublicStatsHiddenForInactiveLeague(t *testing.T) {
	tournamentID := uuid.New()
	repo := fakeRepo{
		standings: map[uuid.UUID][]Standings{tournamentID: {{}}},
		hidden:    map[uuid.UUID]bool{tournamentID: true},
	}
	svc := NewService(repo, &fakeAuthz{})
	if _, err := svc.GetStandingsByTournament(context.Background(), tournamentID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("err = %v, want not found", err)
	}
	if _, err := svc.GetTopScorersByTournament(context.Background(), tournamentID); !errors.Is(err, httpx.ErrNotFound) {
		t.Fatalf("top scorers err = %v, want not found", err)
	}
}

func TestGetStandingsByTournament_EmptyList(t *testing.T) {
	tournamentID := uuid.New()
	standings := []Standings{}

	repo := fakeRepo{standings: map[uuid.UUID][]Standings{tournamentID: standings}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/standings", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got listResponseHelper[Standings]
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if got.Data == nil || len(got.Data) != 0 {
		t.Errorf("expected empty data array, got %+v", got.Data)
	}
}

func TestGetStandingsByTournament_InvalidLimit(t *testing.T) {
	tournamentID := uuid.New()

	repo := fakeRepo{standings: map[uuid.UUID][]Standings{tournamentID: []Standings{}}}
	router := newTestRouter(repo, &fakeAuthz{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/standings?limit=abc", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d (unprocessable entity)", rec.Code, http.StatusUnprocessableEntity)
	}
}
