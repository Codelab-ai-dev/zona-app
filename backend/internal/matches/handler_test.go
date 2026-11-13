package matches

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/authz"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

// fakeRepository implements Repository for unit testing.
type fakeRepository struct {
	mu             sync.Mutex
	matches        map[uuid.UUID]Match
	goals          map[uuid.UUID][]Goal
	cards          map[uuid.UUID][]Card
	incidents      map[uuid.UUID][]Incident
	refereeReports map[uuid.UUID]RefereeReport
	standings      []StandingsTeam
	shouldFailErr  error
	inactive       map[uuid.UUID]bool // tournaments whose league is inactive
	foreignTeams   map[uuid.UUID]bool // teams of another league
}

func (f *fakeRepository) CountLeagueTeams(_ context.Context, _ uuid.UUID, teamIDs []uuid.UUID) (int, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, id := range teamIDs {
		if !f.foreignTeams[id] {
			n++
		}
	}
	return n, nil
}

func (f *fakeRepository) TournamentLeagueActive(_ context.Context, tournamentID uuid.UUID) (bool, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	return !f.inactive[tournamentID], nil
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		matches:        make(map[uuid.UUID]Match),
		goals:          make(map[uuid.UUID][]Goal),
		cards:          make(map[uuid.UUID][]Card),
		incidents:      make(map[uuid.UUID][]Incident),
		refereeReports: make(map[uuid.UUID]RefereeReport),
	}
}

func (f *fakeRepository) GetMatchByID(ctx context.Context, matchID uuid.UUID) (Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Match{}, f.shouldFailErr
	}
	m, ok := f.matches[matchID]
	if !ok {
		return Match{}, httpx.ErrNotFound
	}
	return m, nil
}

func (f *fakeRepository) GetMatchWithRelations(ctx context.Context, matchID uuid.UUID) (MatchWithRelations, error) {
	m, err := f.GetMatchByID(ctx, matchID)
	if err != nil {
		return MatchWithRelations{}, err
	}

	f.mu.Lock()
	defer f.mu.Unlock()
	mwr := MatchWithRelations{Match: m}
	if goals, ok := f.goals[matchID]; ok {
		mwr.Goals = append(mwr.Goals, goals...)
	}
	if cards, ok := f.cards[matchID]; ok {
		mwr.Cards = append(mwr.Cards, cards...)
	}
	if incidents, ok := f.incidents[matchID]; ok {
		mwr.Incidents = append(mwr.Incidents, incidents...)
	}
	return mwr, nil
}

func (f *fakeRepository) ListMatchesByTournament(ctx context.Context, tournamentID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	var result []Match
	for _, m := range f.matches {
		if m.TournamentID == tournamentID {
			result = append(result, m)
		}
	}
	return result, nil
}

func (f *fakeRepository) ListMatchesByTeam(ctx context.Context, teamID uuid.UUID, filters ListMatchesFilter) ([]Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	var result []Match
	for _, m := range f.matches {
		if m.HomeTeamID == teamID || m.AwayTeamID == teamID {
			result = append(result, m)
		}
	}
	return result, nil
}

func (f *fakeRepository) ListUpcomingMatches(ctx context.Context, tournamentID uuid.UUID, limit int) ([]Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	var result []Match
	now := time.Now()
	for _, m := range f.matches {
		if m.TournamentID == tournamentID && m.Status == MatchStatusScheduled && m.MatchDate.After(now) {
			result = append(result, m)
		}
	}
	return result, nil
}

func (f *fakeRepository) ListPendingMatchesByLeague(ctx context.Context, leagueID uuid.UUID, limit int) ([]Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	var result []Match
	for _, m := range f.matches {
		if m.Status == MatchStatusScheduled || m.Status == MatchStatusInProgress {
			result = append(result, m)
		}
	}
	return result, nil
}

func (f *fakeRepository) FindDuplicateMatches(ctx context.Context, tournamentID uuid.UUID) ([]DuplicateMatchGroup, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	return nil, nil
}

func (f *fakeRepository) CreateMatch(ctx context.Context, req CreateMatchRequest) (Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Match{}, f.shouldFailErr
	}
	m := Match{
		ID:           uuid.New(),
		TournamentID: req.TournamentID,
		HomeTeamID:   req.HomeTeamID,
		AwayTeamID:   req.AwayTeamID,
		MatchDate:    req.MatchDate,
		MatchTime:    req.MatchTime,
		Status:       MatchStatusScheduled,
		Round:        req.Round,
		FieldNumber:  req.FieldNumber,
		Phase:        PhaseRegular,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	f.matches[m.ID] = m
	return m, nil
}

func (f *fakeRepository) CreateMatches(ctx context.Context, tournamentID uuid.UUID, reqs []CreateMatchRequest) ([]Match, error) {
	var result []Match
	for _, req := range reqs {
		m, err := f.CreateMatch(ctx, req)
		if err != nil {
			return nil, err
		}
		result = append(result, m)
	}
	return result, nil
}

func (f *fakeRepository) UpdateMatchSchedule(ctx context.Context, matchID uuid.UUID, req UpdateMatchScheduleRequest) (Match, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Match{}, f.shouldFailErr
	}
	m, ok := f.matches[matchID]
	if !ok {
		return Match{}, httpx.ErrNotFound
	}
	if req.MatchDate != nil {
		m.MatchDate = *req.MatchDate
	}
	if req.MatchTime != nil {
		m.MatchTime = req.MatchTime
	}
	if req.FieldNumber != nil {
		m.FieldNumber = req.FieldNumber
	}
	if req.Round != nil {
		m.Round = req.Round
	}
	m.UpdatedAt = time.Now()
	f.matches[matchID] = m
	return m, nil
}

func (f *fakeRepository) DeleteMatch(ctx context.Context, matchID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	m, ok := f.matches[matchID]
	if !ok {
		return httpx.ErrNotFound
	}
	if m.Status != MatchStatusScheduled {
		return httpx.ErrConflict
	}
	delete(f.matches, matchID)
	return nil
}

func (f *fakeRepository) CreateGoal(ctx context.Context, matchID uuid.UUID, req PostGoalRequest) (Goal, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Goal{}, f.shouldFailErr
	}
	g := Goal{
		ID:        uuid.New(),
		MatchID:   matchID,
		PlayerID:  req.PlayerID,
		TeamID:    req.TeamID,
		Minute:    req.Minute,
		GoalType:  GoalTypeNormal,
		CreatedAt: time.Now(),
	}
	if req.GoalType != nil {
		g.GoalType = GoalType(*req.GoalType)
	}
	f.goals[matchID] = append(f.goals[matchID], g)
	return g, nil
}

func (f *fakeRepository) CreateCard(ctx context.Context, matchID uuid.UUID, req PostCardRequest) (Card, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Card{}, f.shouldFailErr
	}
	c := Card{
		ID:        uuid.New(),
		MatchID:   matchID,
		PlayerID:  req.PlayerID,
		TeamID:    req.TeamID,
		CardType:  CardType(req.CardType),
		Minute:    req.Minute,
		Reason:    req.Reason,
		CreatedAt: time.Now(),
	}
	f.cards[matchID] = append(f.cards[matchID], c)
	return c, nil
}

func (f *fakeRepository) CreateIncident(ctx context.Context, matchID uuid.UUID, req PostIncidentRequest) (Incident, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return Incident{}, f.shouldFailErr
	}
	inc := Incident{
		ID:           uuid.New(),
		MatchID:      matchID,
		IncidentType: req.IncidentType,
		Description:  req.Description,
		Minute:       req.Minute,
		PlayerID:     req.PlayerID,
		TeamID:       req.TeamID,
		CreatedAt:    time.Now(),
	}
	f.incidents[matchID] = append(f.incidents[matchID], inc)
	return inc, nil
}

func (f *fakeRepository) CreateOrUpdateRefereeReport(ctx context.Context, matchID uuid.UUID, req PostRefereeReportRequest) (RefereeReport, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return RefereeReport{}, f.shouldFailErr
	}
	rr := RefereeReport{
		ID:                  uuid.New(),
		MatchID:             matchID,
		RefereeName:         req.RefereeName,
		AssistantReferee1:   req.AssistantReferee1,
		AssistantReferee2:   req.AssistantReferee2,
		FourthOfficial:      req.FourthOfficial,
		GeneralObservations: req.GeneralObservations,
		WeatherConditions:   req.WeatherConditions,
		FieldConditions:     req.FieldConditions,
		CreatedAt:           time.Now(),
		UpdatedAt:           time.Now(),
	}
	f.refereeReports[matchID] = rr
	return rr, nil
}

func (f *fakeRepository) GetRefereeReport(ctx context.Context, matchID uuid.UUID) (RefereeReport, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return RefereeReport{}, f.shouldFailErr
	}
	rr, ok := f.refereeReports[matchID]
	if !ok {
		return RefereeReport{}, httpx.ErrNotFound
	}
	return rr, nil
}

func (f *fakeRepository) PostMatchResult(ctx context.Context, matchID uuid.UUID, homeScore int, awayScore int) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	m, ok := f.matches[matchID]
	if !ok {
		return httpx.ErrNotFound
	}
	m.HomeScore = homeScore
	m.AwayScore = awayScore
	m.Status = MatchStatusFinished
	m.UpdatedAt = time.Now()
	f.matches[matchID] = m
	return nil
}

func (f *fakeRepository) PublishMatch(ctx context.Context, matchID uuid.UUID, isPublished bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	m, ok := f.matches[matchID]
	if !ok {
		return httpx.ErrNotFound
	}
	m.IsPublished = isPublished
	m.UpdatedAt = time.Now()
	f.matches[matchID] = m
	return nil
}

func (f *fakeRepository) PublishRound(ctx context.Context, tournamentID uuid.UUID, round int, isPublished bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	found := false
	for id, m := range f.matches {
		if m.TournamentID == tournamentID && m.Round != nil && *m.Round == round {
			m.IsPublished = isPublished
			m.UpdatedAt = time.Now()
			f.matches[id] = m
			found = true
		}
	}
	if !found {
		return httpx.ErrNotFound
	}
	return nil
}

func (f *fakeRepository) GetTournamentStandings(ctx context.Context, tournamentID uuid.UUID) ([]StandingsTeam, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return nil, f.shouldFailErr
	}
	return f.standings, nil
}

// fakeChecker implements authz.Checker for testing.
type fakeChecker struct {
	mu                  sync.Mutex
	canManageTournament bool
	shouldFailErr       error
}

func newFakeChecker() *fakeChecker {
	return &fakeChecker{canManageTournament: true}
}

func (f *fakeChecker) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	if !f.canManageTournament {
		return httpx.ErrForbidden
	}
	return nil
}

func (f *fakeChecker) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	if !f.canManageTournament {
		return httpx.ErrForbidden
	}
	return nil
}

func (f *fakeChecker) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	if !f.canManageTournament {
		return httpx.ErrForbidden
	}
	return nil
}

func (f *fakeChecker) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	if !f.canManageTournament {
		return httpx.ErrForbidden
	}
	return nil
}

func (f *fakeChecker) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.shouldFailErr != nil {
		return f.shouldFailErr
	}
	if !f.canManageTournament {
		return httpx.ErrForbidden
	}
	return nil
}

// Unit tests for the service
func TestCreateMatch_Valid(t *testing.T) {
	repo := newFakeRepository()
	checker := newFakeChecker()
	svc := NewService(repo, checker, nil)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	tournamentID := uuid.New()
	homeTeamID := uuid.New()
	awayTeamID := uuid.New()
	matchDate := time.Now().Add(24 * time.Hour)

	req := CreateMatchRequest{
		TournamentID: tournamentID,
		HomeTeamID:   homeTeamID,
		AwayTeamID:   awayTeamID,
		MatchDate:    matchDate,
	}

	match, err := svc.CreateMatch(context.Background(), caller, req)
	if err != nil {
		t.Fatalf("CreateMatch failed: %v", err)
	}

	if match.TournamentID != tournamentID {
		t.Errorf("tournament_id mismatch: got %v, want %v", match.TournamentID, tournamentID)
	}
	if match.Status != MatchStatusScheduled {
		t.Errorf("status: got %v, want %v", match.Status, MatchStatusScheduled)
	}
}

func TestCreateMatch_Unauthorized(t *testing.T) {
	repo := newFakeRepository()
	checker := newFakeChecker()
	checker.canManageTournament = false
	svc := NewService(repo, checker, nil)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}

	req := CreateMatchRequest{
		TournamentID: uuid.New(),
		HomeTeamID:   uuid.New(),
		AwayTeamID:   uuid.New(),
		MatchDate:    time.Now(),
	}

	_, err := svc.CreateMatch(context.Background(), caller, req)
	if err == nil {
		t.Fatal("expected error for unauthorized user")
	}
}

func TestCreateMatch_InvalidTeams(t *testing.T) {
	repo := newFakeRepository()
	checker := newFakeChecker()
	svc := NewService(repo, checker, nil)

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	teamID := uuid.New()

	req := CreateMatchRequest{
		TournamentID: uuid.New(),
		HomeTeamID:   teamID,
		AwayTeamID:   teamID, // Same as home
		MatchDate:    time.Now(),
	}

	_, err := svc.CreateMatch(context.Background(), caller, req)
	if err == nil {
		t.Fatal("expected validation error for same teams")
	}
}

func TestCreateMatch_ForeignLeagueTeam(t *testing.T) {
	repo := newFakeRepository()
	foreign := uuid.New()
	repo.foreignTeams = map[uuid.UUID]bool{foreign: true}
	svc := NewService(repo, newFakeChecker(), nil)
	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	tournamentID := uuid.New()

	_, err := svc.CreateMatch(context.Background(), caller, CreateMatchRequest{
		TournamentID: tournamentID, HomeTeamID: uuid.New(), AwayTeamID: foreign, MatchDate: time.Now(),
	})
	assertValidation(t, err, "teams")

	_, err = svc.GenerateFixtures(context.Background(), caller, GenerateFixturesRequest{
		TournamentID: tournamentID,
		Teams:        []TeamFixtureData{{ID: uuid.New(), Name: "Local"}, {ID: foreign, Name: "Ajeno"}},
		Schedule: &FixtureSchedule{StartDate: "2027-01-10", MatchDays: []string{"sunday"}, StartTime: "09:00",
			FieldsAvailable: 1, HalfMinutes: 20, HalftimeBreakMinutes: 10, BreakBetweenMatches: 10},
	})
	assertValidation(t, err, "teams")
	if len(repo.matches) != 0 {
		t.Fatalf("created %d matches with a foreign team", len(repo.matches))
	}
}

func assertValidation(t *testing.T, err error, field string) {
	t.Helper()
	var he *httpx.Error
	if !errors.As(err, &he) || he.Status != http.StatusUnprocessableEntity || he.Fields[field] == "" {
		t.Fatalf("want 422 on %q, got %v", field, err)
	}
}

func TestFixtureGenerator_EvenTeams(t *testing.T) {
	teams := []TeamFixtureData{
		{ID: uuid.New(), Name: "Team A"},
		{ID: uuid.New(), Name: "Team B"},
		{ID: uuid.New(), Name: "Team C"},
		{ID: uuid.New(), Name: "Team D"},
	}

	gen := NewFixtureGenerator(teams, false)
	rounds := gen.Generate()

	// Even teams: n-1 rounds = 3 rounds
	if len(rounds) != 3 {
		t.Errorf("rounds: got %d, want 3", len(rounds))
	}

	// Each round should have 2 matches
	for i, round := range rounds {
		if len(round.Matches) != 2 {
			t.Errorf("round %d matches: got %d, want 2", i, len(round.Matches))
		}
	}
}

func TestFixtureGenerator_OddTeams(t *testing.T) {
	teams := []TeamFixtureData{
		{ID: uuid.New(), Name: "Team A"},
		{ID: uuid.New(), Name: "Team B"},
		{ID: uuid.New(), Name: "Team C"},
	}

	gen := NewFixtureGenerator(teams, false)
	rounds := gen.Generate()

	// Odd teams: n rounds = 3 rounds
	if len(rounds) != 3 {
		t.Errorf("rounds: got %d, want 3", len(rounds))
	}

	// Each round should have 1 match (and 1 bye)
	for i, round := range rounds {
		if len(round.Matches) != 1 {
			t.Errorf("round %d matches: got %d, want 1", i, len(round.Matches))
		}
		if round.ByeTeamID == uuid.Nil {
			t.Errorf("round %d: no bye team assigned", i)
		}
	}
}

func TestFixtureGenerator_DoubleRound(t *testing.T) {
	teams := []TeamFixtureData{
		{ID: uuid.New(), Name: "Team A"},
		{ID: uuid.New(), Name: "Team B"},
	}

	gen := NewFixtureGenerator(teams, true)
	rounds := gen.Generate()

	// Double round: 2*(n-1) = 2 rounds
	if len(rounds) != 2 {
		t.Errorf("rounds: got %d, want 2", len(rounds))
	}
}

func TestDeleteMatch_SuccessfulDelete(t *testing.T) {
	repo := newFakeRepository()
	checker := newFakeChecker()
	svc := NewService(repo, checker, nil)

	// Create a match first
	matchID := uuid.New()
	match := Match{
		ID:        matchID,
		Status:    MatchStatusScheduled,
		MatchDate: time.Now(),
	}
	repo.matches[matchID] = match

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	err := svc.DeleteMatch(context.Background(), caller, matchID)
	if err != nil {
		t.Fatalf("DeleteMatch failed: %v", err)
	}

	_, exists := repo.matches[matchID]
	if exists {
		t.Error("match still exists after delete")
	}
}

func TestDeleteMatch_FailedNotScheduled(t *testing.T) {
	repo := newFakeRepository()
	checker := newFakeChecker()
	svc := NewService(repo, checker, nil)

	// Create a finished match
	matchID := uuid.New()
	match := Match{
		ID:        matchID,
		Status:    MatchStatusFinished,
		MatchDate: time.Now(),
	}
	repo.matches[matchID] = match

	caller := auth.Principal{UserID: uuid.New(), Role: auth.RoleLeagueAdmin}
	err := svc.DeleteMatch(context.Background(), caller, matchID)
	if err == nil {
		t.Fatal("expected error when deleting non-scheduled match")
	}
}

func TestValidation_CreateMatchRequest(t *testing.T) {
	tests := []struct {
		name string
		req  CreateMatchRequest
		want bool
	}{
		{
			name: "valid",
			req: CreateMatchRequest{
				TournamentID: uuid.New(),
				HomeTeamID:   uuid.New(),
				AwayTeamID:   uuid.New(),
				MatchDate:    time.Now(),
			},
			want: true,
		},
		{
			name: "missing tournament",
			req: CreateMatchRequest{
				HomeTeamID: uuid.New(),
				AwayTeamID: uuid.New(),
				MatchDate:  time.Now(),
			},
			want: false,
		},
		{
			name: "same teams",
			req: func() CreateMatchRequest {
				teamID := uuid.New()
				return CreateMatchRequest{
					TournamentID: uuid.New(),
					HomeTeamID:   teamID,
					AwayTeamID:   teamID,
					MatchDate:    time.Now(),
				}
			}(),
			want: false,
		},
		{
			name: "negative field number",
			req: CreateMatchRequest{
				TournamentID: uuid.New(),
				HomeTeamID:   uuid.New(),
				AwayTeamID:   uuid.New(),
				MatchDate:    time.Now(),
				FieldNumber:  intPtr(0),
			},
			want: false,
		},
	}

	for _, tc := range tests {
		if tc.req.HomeTeamID == tc.req.AwayTeamID && tc.want {
			tc.want = false
		}
		errs := tc.req.Validate()
		isValid := len(errs) == 0
		if isValid != tc.want {
			t.Errorf("%s: validation valid=%v, want %v (errs=%v)", tc.name, isValid, tc.want, errs)
		}
	}
}

func intPtr(v int) *int {
	return &v
}

func TestPublishMatch(t *testing.T) {
	matchID := uuid.New()
	tournamentID := uuid.New()
	homeTID := uuid.New()
	awayTID := uuid.New()

	tests := []struct {
		name          string
		matchID       uuid.UUID
		req           PublishMatchRequest
		canManage     bool
		repoShouldErr bool
		wantStatus    int
		wantPublished bool
	}{
		{
			name:          "happy path - publish",
			matchID:       matchID,
			req:           PublishMatchRequest{IsPublished: true},
			canManage:     true,
			wantStatus:    204,
			wantPublished: true,
		},
		{
			name:          "happy path - unpublish",
			matchID:       matchID,
			req:           PublishMatchRequest{IsPublished: false},
			canManage:     true,
			wantStatus:    204,
			wantPublished: false,
		},
		{
			name:          "not found",
			matchID:       uuid.New(),
			req:           PublishMatchRequest{IsPublished: true},
			canManage:     true,
			repoShouldErr: true,
			wantStatus:    404,
		},
		{
			name:       "forbidden",
			matchID:    matchID,
			req:        PublishMatchRequest{IsPublished: true},
			canManage:  false,
			wantStatus: 403,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newFakeRepository()
			checker := newFakeChecker()
			checker.canManageTournament = tc.canManage
			if tc.repoShouldErr {
				repo.shouldFailErr = httpx.ErrNotFound
			}

			// Create a match for testing
			m := Match{
				ID:           matchID,
				TournamentID: tournamentID,
				HomeTeamID:   homeTID,
				AwayTeamID:   awayTID,
				MatchDate:    time.Now(),
				Status:       MatchStatusScheduled,
				Phase:        PhaseRegular,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			repo.matches[matchID] = m

			svc := NewService(repo, checker, nil)

			caller := auth.Principal{UserID: uuid.New()}
			ctx := auth.WithPrincipal(context.Background(), caller)

			err := svc.PublishMatch(ctx, caller, matchID, tc.req)

			if tc.wantStatus == 204 {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if tc.canManage && !tc.repoShouldErr {
					published := repo.matches[matchID].IsPublished
					if published != tc.wantPublished {
						t.Errorf("IsPublished=%v, want %v", published, tc.wantPublished)
					}
				}
			} else {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
			}
		})
	}
}

func TestPublishRound(t *testing.T) {
	tournamentID := uuid.New()
	homeTID := uuid.New()
	awayTID := uuid.New()
	round := 1

	tests := []struct {
		name         string
		tournament   uuid.UUID
		round        int
		req          PublishRoundRequest
		canManage    bool
		setupMatches bool
		wantStatus   int
	}{
		{
			name:         "happy path - publish round",
			tournament:   tournamentID,
			round:        round,
			req:          PublishRoundRequest{IsPublished: true},
			canManage:    true,
			setupMatches: true,
			wantStatus:   204,
		},
		{
			name:         "not found (no matches)",
			tournament:   uuid.New(),
			round:        99,
			req:          PublishRoundRequest{IsPublished: true},
			canManage:    true,
			setupMatches: false,
			wantStatus:   404,
		},
		{
			name:         "forbidden",
			tournament:   tournamentID,
			round:        round,
			req:          PublishRoundRequest{IsPublished: true},
			canManage:    false,
			setupMatches: true,
			wantStatus:   403,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := newFakeRepository()
			checker := newFakeChecker()
			checker.canManageTournament = tc.canManage

			if tc.setupMatches {
				// Create a match in the round
				m := Match{
					ID:           uuid.New(),
					TournamentID: tc.tournament,
					HomeTeamID:   homeTID,
					AwayTeamID:   awayTID,
					MatchDate:    time.Now(),
					Round:        &tc.round,
					Status:       MatchStatusScheduled,
					Phase:        PhaseRegular,
					CreatedAt:    time.Now(),
					UpdatedAt:    time.Now(),
				}
				repo.matches[m.ID] = m
			}

			svc := NewService(repo, checker, nil)
			caller := auth.Principal{UserID: uuid.New()}
			ctx := auth.WithPrincipal(context.Background(), caller)

			err := svc.PublishRound(ctx, caller, tc.tournament, tc.round, tc.req)

			if tc.wantStatus == 204 {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
			} else {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
			}
		})
	}
}

func TestPlayoffBracketBuilder(t *testing.T) {
	// Test the bracket builder in isolation
	tests := []struct {
		name            string
		numTeams        int
		thirdPlaceMatch bool
		homeAndAway     bool
		wantMatchCount  int
	}{
		{
			name:            "4 teams, no third place, single leg",
			numTeams:        4,
			thirdPlaceMatch: false,
			homeAndAway:     false,
			wantMatchCount:  3, // 2 semis + 1 final
		},
		{
			name:            "4 teams, with third place, single leg",
			numTeams:        4,
			thirdPlaceMatch: true,
			homeAndAway:     false,
			wantMatchCount:  4, // 2 semis + 1 third place + 1 final
		},
		{
			name:            "4 teams, with third place, double leg",
			numTeams:        4,
			thirdPlaceMatch: true,
			homeAndAway:     true,
			wantMatchCount:  6, // 4 semis (2x2) + 1 third place + 1 final
		},
		{
			name:            "8 teams, no third place, single leg",
			numTeams:        8,
			thirdPlaceMatch: false,
			homeAndAway:     false,
			wantMatchCount:  7, // 4 QF + 2 SF + 1 final
		},
		{
			name:            "8 teams, with third place, double leg",
			numTeams:        8,
			thirdPlaceMatch: true,
			homeAndAway:     true,
			wantMatchCount:  14, // 8 QF (4x2) + 4 SF (2x2) + 1 third place + 1 final
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			standings := make([]StandingsTeam, tc.numTeams)
			for i := 0; i < tc.numTeams; i++ {
				standings[i] = StandingsTeam{
					TeamID:         uuid.New(),
					Points:         30 - i*3,
					GoalDifference: 10 - i,
					GoalsFor:       25 - i*2,
				}
			}

			builder := NewPlayoffBracketBuilder(standings, tc.numTeams, time.Now(), "10:00", 1, tc.thirdPlaceMatch, tc.homeAndAway)
			matches := builder.Generate()

			if len(matches) != tc.wantMatchCount {
				t.Errorf("match count: got %d, want %d", len(matches), tc.wantMatchCount)
			}

			// Verify all matches have required fields
			for _, m := range matches {
				if m.HomeTeamID == uuid.Nil {
					t.Error("match missing home_team_id")
				}
				if m.AwayTeamID == uuid.Nil {
					t.Error("match missing away_team_id")
				}
				if m.Phase != PhasePlayoffs {
					t.Errorf("match phase: got %v, want %v", m.Phase, PhasePlayoffs)
				}
				if m.PlayoffRound == nil {
					t.Error("match missing playoff_round")
				}
				if m.PlayoffPosition == nil {
					t.Error("match missing playoff_position")
				}
			}
		})
	}
}

// listResponseHelper is used to decode list responses in tests
type listResponseHelper[T any] struct {
	Data []T        `json:"data"`
	Page httpx.Page `json:"page"`
}

// fakeAuthz for testing
type fakeAuthzMatches struct {
	allowed bool
}

func (f *fakeAuthzMatches) CanManageLeague(ctx context.Context, p auth.Principal, leagueID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthzMatches) CanManageTournament(ctx context.Context, p auth.Principal, tournamentID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthzMatches) CanManageMatch(ctx context.Context, p auth.Principal, matchID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthzMatches) CanManageTeam(ctx context.Context, p auth.Principal, teamID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func (f *fakeAuthzMatches) CanManagePlayer(ctx context.Context, p auth.Principal, playerID uuid.UUID) error {
	if f.allowed {
		return nil
	}
	return httpx.ErrForbidden
}

func newTestRouterMatches(repo Repository, azChecker authz.Checker) chi.Router {
	r := chi.NewRouter()
	svc := NewService(repo, azChecker, nil) // no pool needed for handler tests
	NewHandler(svc).Routes(r)
	return r
}

func TestListMatches_EmptyList(t *testing.T) {
	tournamentID := uuid.New()
	repo := newFakeRepository()
	router := newTestRouterMatches(repo, &fakeAuthzMatches{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/matches", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}

	var got listResponseHelper[Match]
	if err := json.NewDecoder(rec.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}

	if got.Data == nil || len(got.Data) != 0 {
		t.Errorf("expected empty data array, got %+v", got.Data)
	}
}

func TestListMatches_InvalidLimit(t *testing.T) {
	tournamentID := uuid.New()
	repo := newFakeRepository()
	router := newTestRouterMatches(repo, &fakeAuthzMatches{allowed: true})

	req := httptest.NewRequest(http.MethodGet, "/tournaments/"+tournamentID.String()+"/matches?limit=abc", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status = %d, want %d (unprocessable entity)", rec.Code, http.StatusUnprocessableEntity)
	}
}
