package teams

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/Codelab-ai-dev/zona-app/backend/internal/auth"
	"github.com/Codelab-ai-dev/zona-app/backend/internal/platform/httpx"
)

func intp(n int) *int { return &n }

// asDate converts an optional time to the API date type.
func asDate(t *time.Time) *httpx.Date {
	if t == nil {
		return nil
	}
	d := httpx.NewDate(*t)
	return &d
}

func date(y int, m time.Month, d int) time.Time { return time.Date(y, m, d, 0, 0, 0, 0, time.UTC) }

func TestValidatePlayerAge(t *testing.T) {
	ref := date(2026, time.March, 1)
	base := Tournament{AgeValidationEnabled: true, MinAge: intp(18), MaxAge: intp(35), AgeReferenceDate: &ref}
	withExceptions := base
	withExceptions.AgeExceptionCount = 2
	withExceptions.AgeExceptionMaxAge = intp(40)

	tests := []struct {
		name          string
		birth         time.Time
		tournament    Tournament
		used          int
		wantValid     bool
		wantException bool
		wantAge       int
	}{
		{"validation disabled", date(2015, 1, 1), Tournament{}, 0, true, false, -1},
		{"turns 18 on reference date", date(2008, time.March, 1), base, 0, true, false, 18},
		{"turns 18 the day after", date(2008, time.March, 2), base, 0, false, false, 17},
		{"35 exactly", date(1991, time.March, 1), base, 0, true, false, 35},
		{"36 without exceptions", date(1990, time.February, 1), base, 0, false, false, 36},
		{"38 uses an exception", date(1988, time.January, 1), withExceptions, 1, true, true, 38},
		{"38 with exceptions exhausted", date(1988, time.January, 1), withExceptions, 2, false, false, 38},
		{"45 outside exception range", date(1981, time.January, 1), withExceptions, 0, false, false, 45},
	}

	s := &Service{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := s.validatePlayerAge(tt.birth, tt.tournament, tt.used)
			if got.isValid != tt.wantValid || got.isException != tt.wantException {
				t.Fatalf("got valid=%v exception=%v (%s), want valid=%v exception=%v", got.isValid, got.isException, got.reason, tt.wantValid, tt.wantException)
			}
			if tt.wantAge >= 0 && got.age != tt.wantAge {
				t.Errorf("age = %d, want %d", got.age, tt.wantAge)
			}
			if !got.isValid && got.reason == "" {
				t.Error("invalid result must explain why")
			}
		})
	}
}

// rulesRepo controls the data RequestPlayerRegistration reads.
type rulesRepo struct {
	*fakeRepository
	team       Team
	tournament Tournament
	active     int
	pending    int
	exceptions int
	created    bool
}

func (r *rulesRepo) GetTeamByID(context.Context, uuid.UUID) (Team, error) { return r.team, nil }
func (r *rulesRepo) GetTournamentByID(context.Context, uuid.UUID) (Tournament, error) {
	return r.tournament, nil
}
func (r *rulesRepo) CountPlayersByTeamTournament(context.Context, uuid.UUID, uuid.UUID) (int, error) {
	return r.active, nil
}
func (r *rulesRepo) CountPendingPlayerRegistrationsByTeamTournament(context.Context, uuid.UUID, uuid.UUID) (int, error) {
	return r.pending, nil
}
func (r *rulesRepo) CountExceptionPlayersByTeamTournament(context.Context, uuid.UUID, uuid.UUID) (int, error) {
	return r.exceptions, nil
}
func (r *rulesRepo) CreatePlayerRegistrationRequest(_ context.Context, req PlayerRegistrationRequest) (PlayerRegistrationRequest, error) {
	r.created = true
	return req, nil
}

func TestRequestPlayerRegistrationRules(t *testing.T) {
	leagueID := uuid.New()
	teamID := uuid.New()
	ref := date(2026, time.March, 1)
	adult := date(2000, 1, 1)
	minor := date(2012, 1, 1)
	open := Tournament{LeagueID: leagueID, RegistrationOpen: true, MaxPlayers: intp(20)}
	ageRules := open
	ageRules.AgeValidationEnabled, ageRules.MinAge, ageRules.AgeReferenceDate = true, intp(18), &ref
	closed := open
	closed.RegistrationOpen = false
	foreign := open
	foreign.LeagueID = uuid.New()

	tests := []struct {
		name       string
		tournament Tournament
		active     int
		pending    int
		birth      *time.Time
		wantField  string // empty = success
	}{
		{"happy path", open, 5, 2, &adult, ""},
		{"tournament of another league", foreign, 0, 0, &adult, "tournament_id"},
		{"registration closed", closed, 0, 0, &adult, "tournament_id"},
		{"limit reached counting pending", open, 18, 2, &adult, "team_id"},
		{"too young", ageRules, 0, 0, &minor, "birth_date"},
		{"missing birth date when ages are validated", ageRules, 0, 0, nil, "birth_date"},
		{"missing birth date without age rules", open, 0, 0, nil, ""},
	}

	owner := auth.Principal{UserID: uuid.New(), Role: auth.RoleTeamOwner}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := &rulesRepo{
				fakeRepository: newFakeRepository(),
				team:           Team{ID: teamID, LeagueID: leagueID},
				tournament:     tt.tournament,
				active:         tt.active,
				pending:        tt.pending,
			}
			checker := &fakeAuthzChecker{allowedTeams: map[uuid.UUID]bool{teamID: true}}
			svc := NewService(repo, nil, checker)

			_, err := svc.RequestPlayerRegistration(context.Background(), owner, teamID, uuid.New(),
				CreatePlayerRegistrationRequestRequest{PlayerName: "Ana", PlayerPosition: "Delantero", JerseyNumber: 9, BirthDate: asDate(tt.birth)})

			if tt.wantField == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if !repo.created {
					t.Fatal("request was not stored")
				}
				return
			}
			var he *httpx.Error
			if !errors.As(err, &he) || he.Fields[tt.wantField] == "" {
				t.Fatalf("err = %v, want validation error on %q", err, tt.wantField)
			}
			if repo.created {
				t.Fatal("invalid request must not be stored")
			}
		})
	}
}
